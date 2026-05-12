// AIH Safe — Governed Activity Feed
// GET  /api/aihsafe/activity — list posts scoped to the actor's trust units
// POST /api/aihsafe/activity — create a governed post

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";
import {
  buildActorContext,
  canPostContent,
  emitAuditEvent,
  listMembershipsForUser,
  resolvePolicyProfile,
  selectApprovalRecipients,
} from "@/lib/aihsafe";
import { asAIHUserId } from "@/types/aihsafe/ids";
import { VisibilityScope } from "@/types/aihsafe/visibility";
import { isMinorTier } from "@/types/aihsafe/age-tiers";
import { AuditEventKind } from "@/types/aihsafe/audit-events";
import { ReasonCode } from "@/types/aihsafe/governance";
import {
  created,
  ok,
  accepted,
  approvalExpiresAt,
  forbidden,
  unauthenticated,
  governanceDenied,
  rateLimited,
  validationFail,
  serverError,
} from "@/lib/aihsafe/api/envelopes";
import { checkPostLimits } from "@/lib/aihsafe/limits";
import { readJson, parsePagination } from "@/lib/aihsafe/api/parse";
import type { ActivityPostDTO } from "@/types/aihsafe/dto";

const CreatePostSchema = z.object({
  bodyText:        z.string().min(1).max(2000),
  trustUnitId:     z.string().optional(),
  familyUnitId:    z.string().optional(),
  visibilityScope: z.nativeEnum(VisibilityScope).optional(),
  attachmentType:  z.string().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildVisibilityReasons(
  trustUnitId: string | null,
  trustUnitName: string | null,
  scope: string,
): string[] {
  const reasons: string[] = [];
  if (trustUnitName) reasons.push(trustUnitName);
  if (scope === "trust_unit") reasons.push("approved trusted space");
  else if (scope === "family") reasons.push("family members only");
  else if (scope === "guardian_only") reasons.push("guardians only");
  else if (scope === "private") reasons.push("visible only to you");
  return reasons;
}

function mapPost(
  post: {
    id: string;
    authorId: string;
    trustUnitId: string | null;
    familyUnitId: string | null;
    visibilityScope: string;
    bodyText: string;
    governanceState: string;
    escalationState: string;
    attachmentType: string | null;
    createdAt: Date;
    author: { firstName: string; lastName: string; photoUrl: string | null };
    trustUnit: { aihMeta: { name: string | null } | null } | null;
    _count: { comments: number };
  }
): ActivityPostDTO {
  const trustUnitName = post.trustUnit?.aihMeta?.name ?? null;
  return {
    id:               post.id,
    authorId:         post.authorId,
    authorName:       `${post.author.firstName} ${post.author.lastName}`.trim(),
    authorPhotoUrl:   post.author.photoUrl,
    trustUnitId:      post.trustUnitId,
    trustUnitName,
    familyUnitId:     post.familyUnitId,
    visibilityScope:  post.visibilityScope,
    bodyText:         post.bodyText,
    governanceState:  post.governanceState,
    escalationState:  post.escalationState,
    attachmentType:   post.attachmentType,
    createdAt:        post.createdAt.toISOString(),
    commentCount:     post._count.comments,
    visibilityReasons: buildVisibilityReasons(post.trustUnitId, trustUnitName, post.visibilityScope),
  };
}

const POST_SELECT = {
  id: true, authorId: true, trustUnitId: true, familyUnitId: true,
  visibilityScope: true, bodyText: true, governanceState: true,
  escalationState: true, attachmentType: true, createdAt: true,
  author:    { select: { firstName: true, lastName: true, photoUrl: true } },
  trustUnit: { select: { aihMeta: { select: { name: true } } } },
  _count:    { select: { comments: true } },
} as const;

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return unauthenticated();

    const { limit, cursor } = parsePagination(req);

    // Fetch the trust unit IDs this user belongs to
    const actor = await buildActorContext(asAIHUserId(user.id));
    const memberships = await listMembershipsForUser(asAIHUserId(user.id));
    const memberTrustUnitIds = memberships.map((m) => m.trustUnitId as string);

    // Posts visible to this user = posts in their trust units OR their own posts
    const posts = await prisma.aihActivityPost.findMany({
      where: {
        OR: [
          { trustUnitId: { in: memberTrustUnitIds } },
          { authorId: user.id, trustUnitId: null },
        ],
        governanceState: "allowed",
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: POST_SELECT,
    });

    const hasMore = posts.length > limit;
    const items = posts.slice(0, limit).map(mapPost);
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    return ok({
      items,
      pagination: { cursor: nextCursor, hasMore, total: items.length },
    });
  } catch (err) {
    console.error("[aihsafe/activity GET]", err);
    return serverError();
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return unauthenticated();

    const body = await readJson(req);
    const parsed = CreatePostSchema.safeParse(body);
    if (!parsed.success) return validationFail("Invalid request body");

    const { bodyText, trustUnitId, familyUnitId, visibilityScope, attachmentType } = parsed.data;

    // ── Limits gate ────────────────────────────────────────────────────────────
    const limitCheck = await checkPostLimits(user.id);
    if (!limitCheck.allowed) return rateLimited(limitCheck.message);

    // ── Actor context ──────────────────────────────────────────────────────────
    const actor = await buildActorContext(asAIHUserId(user.id));

    // ── Policy resolution + scope ──────────────────────────────────────────────
    // Minor actors: enforce allowMinorPosting and resolve default scope from policy.
    // Adult actors: honor founder's defaultVisibilityScope when no scope supplied.
    let scope: VisibilityScope;
    let requiresGuardianApproval = false;

    if (isMinorTier(actor.ageTier)) {
      const policy = await resolvePolicyProfile(user.id);
      if (!policy.posting.allowed) {
        return forbidden(
          "Posting is currently disabled for your account. Ask your guardian if you have questions."
        );
      }
      scope = visibilityScope ?? (policy.visibility.defaultScope as VisibilityScope);
      requiresGuardianApproval = policy.escalation.requiresGuardianApprovalForPostContent;
    } else {
      if (visibilityScope) {
        scope = visibilityScope;
      } else {
        const fs = await prisma.aihFounderSettings.findFirst({
          select: { defaultVisibilityScope: true },
        });
        scope = (fs?.defaultVisibilityScope as VisibilityScope | undefined) ?? VisibilityScope.TRUST_UNIT;
      }
    }

    // ── Governance gate (scope check) ──────────────────────────────────────────
    const decision = canPostContent(actor, {
      visibilityScope: scope,
      trustUnitId:     trustUnitId as any,
    });
    if (!decision.allowed) return governanceDenied(decision);

    // ── Escalation: guardian approval required for this minor's post ───────────
    if (requiresGuardianApproval) {
      const eligibleApprovers = selectApprovalRecipients(actor.guardedByRelationships);
      if (eligibleApprovers.length === 0) {
        // Minor has no guardian with approval authority — block the post.
        return governanceDenied({
          allowed:          false,
          reasonCode:       ReasonCode.REQUIRES_GUARDIAN_APPROVAL,
          reason:           "Guardian approval is required to post, but no guardian with approval authority is linked to your account. Ask a guardian to set up their account.",
          requiredApproval: true,
        });
      }

      // Resolve trust unit name for the context summary shown to guardians.
      let spaceName: string | null = null;
      if (trustUnitId) {
        const tuMeta = await prisma.aihTrustUnitMeta.findUnique({
          where:  { trustUnitId },
          select: { name: true },
        });
        spaceName = tuMeta?.name ?? null;
      }

      const expiresAt   = approvalExpiresAt();
      const contextJson = {
        action:          "create_activity_post",
        bodyText,
        visibilityScope: scope,
        trustUnitId:     trustUnitId ?? null,
        familyUnitId:    familyUnitId ?? null,
        attachmentType:  attachmentType ?? null,
        spaceName,
        requestedAt:     new Date().toISOString(),
      };

      // One approval request per eligible guardian (first-write-wins; sibling revocation
      // is already handled by the approvals POST handler on resolution).
      const approvalRequests = await Promise.all(
        eligibleApprovers.map(g =>
          prisma.aihApprovalRequest.create({
            data: {
              requestorId: user.id,
              approverId:  g.guardianUserId as string,
              actionKind:  AuditEventKind.ACTIVITY_POST_PENDING,
              contextJson,
              expiresAt,
            },
          })
        )
      );
      const approvalRequest = approvalRequests[0];

      await emitAuditEvent({
        kind:     AuditEventKind.ACTIVITY_POST_PENDING,
        actorId:  user.id,
        targetId: null,
        meta: {
          escalated:         true,
          approvalRequestId: approvalRequest.id,
          guardianCount:     approvalRequests.length,
          bodyPreview:       bodyText.slice(0, 80),
        },
      });

      return accepted(
        {
          approvalRequestId: approvalRequest.id,
          expiresAt:         expiresAt.toISOString(),
          actionKind:        AuditEventKind.ACTIVITY_POST_PENDING,
        },
        {
          allowed:          false,
          reasonCode:       ReasonCode.REQUIRES_GUARDIAN_APPROVAL,
          reason:           "Your post needs guardian approval before it can be shared.",
          requiredApproval: true,
        },
        approvalRequest.id
      );
    }

    // ── Direct post creation (no escalation required) ──────────────────────────
    const post = await prisma.aihActivityPost.create({
      data: {
        authorId:        user.id,
        trustUnitId:     trustUnitId ?? null,
        familyUnitId:    familyUnitId ?? null,
        visibilityScope: scope,
        bodyText,
        governanceState: "allowed",
        escalationState: "none",
        attachmentType:  attachmentType ?? null,
      },
      select: POST_SELECT,
    });

    await emitAuditEvent({
      kind:     AuditEventKind.VISIBILITY_CHANGED,
      actorId:  user.id,
      targetId: post.id,
      meta:     { action: "post_created", trustUnitId: trustUnitId ?? null, scope },
    });

    return created(mapPost(post));
  } catch (err) {
    console.error("[aihsafe/activity POST]", err);
    return serverError();
  }
}
