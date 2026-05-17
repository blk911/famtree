// AIH Safe — Invites API
// POST /api/aihsafe/invites — send a trust-unit or family-unit invite (with guardian-consent lifecycle)
// GET  /api/aihsafe/invites — list invites sent by the current actor

import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";
import {
  buildActorContext,
  canInviteToTrustUnit,
  emitAuditEvent,
  selectApprovalRecipients,
} from "@/lib/aihsafe";
import { createInvite } from "@/lib/invite";
import { asAIHUserId, asTrustUnitId } from "@/types/aihsafe/ids";
import { AuditEventKind } from "@/types/aihsafe/audit-events";
import { AgeTier } from "@/types/aihsafe/age-tiers";
import { deriveAgeTier } from "@/lib/aihsafe";
import { isHumanTrustEligible } from "@/lib/trust/isHumanTrustEligible";
import {
  approvalExpiresAt,
  accepted,
  created,
  ok,
  unauthenticated,
  governanceDenied,
  rateLimited,
  validationFail,
  serverError,
} from "@/lib/aihsafe/api/envelopes";
import { checkInviteLimits } from "@/lib/aihsafe/limits";
import { readJson, parsePagination } from "@/lib/aihsafe/api/parse";
import type { InviteDTO } from "@/types/aihsafe/dto";

// ─── Validation ───────────────────────────────────────────────────────────────

const InviteMemberSchema = z.object({
  trustUnitId:    z.string().min(1).optional(),
  familyUnitId:   z.string().min(1).optional(),
  recipientEmail: z.string().email(),
  relationship:   z.enum(["parent", "child", "sibling", "spouse", "so", "frnd", "other"]),
  targetAgeTier:  z.nativeEnum(AgeTier).optional(),
}).refine(
  data => data.trustUnitId || data.familyUnitId,
  { message: "At least one of trustUnitId or familyUnitId is required" }
);

// ─── DTO mapper ───────────────────────────────────────────────────────────────

function toInviteDTO(
  row: {
    id: string;
    recipientEmail: string;
    status: string;
    relationship: string | null;
    expiresAt: Date;
    createdAt: Date;
  },
  trustUnitId: string | null,
  familyUnitId: string | null
): InviteDTO {
  return {
    id:             row.id,
    recipientEmail: row.recipientEmail,
    status:         row.status,
    relationship:   row.relationship ?? "other",
    trustUnitId,
    familyUnitId,
    expiresAt:      row.expiresAt.toISOString(),
    createdAt:      row.createdAt.toISOString(),
  };
}

// ─── POST — send invite ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthenticated();
  }

  const actor = await buildActorContext(asAIHUserId(user.id)).catch(() => null);
  if (!actor) return serverError("Failed to build actor context");

  const body = await readJson(req);
  const parsed = InviteMemberSchema.safeParse(body);
  if (!parsed.success) {
    const fields = parsed.error.errors.map(e => ({
      path:    e.path.join("."),
      message: e.message,
    }));
    return validationFail("Invalid request body", fields);
  }

  const { recipientEmail, relationship, targetAgeTier, trustUnitId, familyUnitId } = parsed.data;

  const limitCheck = await checkInviteLimits(user.id);
  if (!limitCheck.allowed) return rateLimited(limitCheck.message);

  // Derive target's age tier server-side — never trust client-supplied ageTier for
  // governance decisions. The client hint (targetAgeTier) is ignored when the target
  // has an existing account; it is used only when the account does not yet exist,
  // and only to make the check MORE restrictive (minor hint → escalate).
  let effectiveTargetAgeTier: AgeTier | undefined;
  const targetUser = await prisma.user.findFirst({
    where:  { email: { equals: recipientEmail, mode: "insensitive" } },
    select: { dateOfBirth: true, role: true, email: true },
  });
  if (targetUser) {
    effectiveTargetAgeTier = deriveAgeTier(targetUser.dateOfBirth ?? null);
  } else if (targetAgeTier) {
    // No account yet — use the client hint only if it signals a minor so that
    // escalation is triggered. Discard adult/elder hints (safe-by-default).
    const minorTierSet: string[] = [AgeTier.CHILD, AgeTier.PRETEEN, AgeTier.TEEN];
    effectiveTargetAgeTier = minorTierSet.includes(targetAgeTier) ? targetAgeTier : undefined;
  }

  const targetTrustUnitEligible =
    trustUnitId && targetUser
      ? isHumanTrustEligible({ role: targetUser.role, email: targetUser.email })
      : undefined;

  const targetContext = {
    ...(trustUnitId ? { trustUnitId: asTrustUnitId(trustUnitId) } : {}),
    ...(effectiveTargetAgeTier ? { targetAgeTier: effectiveTargetAgeTier } : {}),
    ...(targetTrustUnitEligible !== undefined ? { targetTrustUnitEligible } : {}),
  };

  const decision = canInviteToTrustUnit(actor, targetContext);
  if (!decision.allowed && !decision.requiredApproval) {
    await emitAuditEvent({
      kind:     AuditEventKind.INVITE_SENT_CHILD,
      actorId:  actor.actorUserId as string,
      targetId: trustUnitId ?? familyUnitId ?? null,
      meta:     { recipientEmail, reasonCode: decision.reasonCode, denied: true },
    });
    return governanceDenied(decision);
  }

  if (decision.requiredApproval) {
    const eligibleApprovers = selectApprovalRecipients(actor.guardedByRelationships);
    if (eligibleApprovers.length === 0) return governanceDenied(decision);

    const expiresAt  = approvalExpiresAt();
    const contextJson: Prisma.InputJsonValue = {
      action: "invite_member",
      recipientEmail,
      relationship,
      trustUnitId:  trustUnitId ?? null,
      familyUnitId: familyUnitId ?? null,
      targetAgeTier: targetAgeTier ?? null,
    };

    const approvalRequests = await Promise.all(
      eligibleApprovers.map(g =>
        prisma.aihApprovalRequest.create({
          data: {
            requestorId: user.id,
            approverId:  g.guardianUserId as string,
            actionKind:  AuditEventKind.INVITE_SENT_CHILD,
            contextJson,
            expiresAt,
          },
        })
      )
    );
    const approvalRequest = approvalRequests[0];

    await emitAuditEvent({
      kind:     AuditEventKind.INVITE_SENT_CHILD,
      actorId:  actor.actorUserId as string,
      targetId: trustUnitId ?? familyUnitId ?? null,
      meta:     { recipientEmail, escalated: true, approvalRequestId: approvalRequest.id, guardianCount: approvalRequests.length },
    });

    return accepted(
      {
        approvalRequestId: approvalRequest.id,
        expiresAt:         expiresAt.toISOString(),
        actionKind:        AuditEventKind.INVITE_SENT_CHILD,
      },
      decision,
      approvalRequest.id
    );
  }

  // Delegate to the existing invite system
  const invite = await createInvite(user, recipientEmail, relationship);

  const minorTierSet: string[] = [AgeTier.CHILD, AgeTier.PRETEEN, AgeTier.TEEN];
  const auditKind = effectiveTargetAgeTier && minorTierSet.includes(effectiveTargetAgeTier)
    ? AuditEventKind.INVITE_SENT_CHILD
    : AuditEventKind.INVITE_GUARDIAN_APPROVED;

  await emitAuditEvent({
    kind:     auditKind,
    actorId:  actor.actorUserId as string,
    targetId: trustUnitId ?? familyUnitId ?? null,
    meta:     { inviteId: invite.id, recipientEmail, relationship, trustUnitId: trustUnitId ?? null, familyUnitId: familyUnitId ?? null },
  });

  return created(toInviteDTO(invite, trustUnitId ?? null, familyUnitId ?? null));
}

// ─── GET — list invites sent by actor ────────────────────────────────────────

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthenticated();
  }

  await buildActorContext(asAIHUserId(user.id)).catch(() => null);

  const { cursor, limit } = parsePagination(req);

  const rows = await prisma.invite.findMany({
    where:   { senderId: user.id },
    orderBy: { createdAt: "desc" },
    take:    limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const items   = hasMore ? rows.slice(0, limit) : rows;

  return ok({
    items:      items.map(r => toInviteDTO(r, null, null)),
    pagination: {
      cursor:  hasMore ? items[items.length - 1].id : null,
      hasMore,
      total:   null,
    },
  });
}
