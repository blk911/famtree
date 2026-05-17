// AIH Safe — Deferred Action Re-execution
// Called after a guardian approves an AihApprovalRequest to replay the original action.
// Guardian approval IS the authorization — governance gate is NOT re-run here.

import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db/prisma";
import { emitAuditEvent } from "@/lib/aihsafe/audit";
import { AuditEventKind } from "@/types/aihsafe/audit-events";
import type { TrustUnitKind } from "@/types/aihsafe/trust-units";
import {
  deriveVaultSpaceTypeFromTrustKind,
  type VaultSpaceType,
} from "@/lib/aihsafe/vault-space";
import { isHumanTrustEligible } from "@/lib/trust/isHumanTrustEligible";

type DeferredResult =
  | { ok: true }
  | { ok: false; reason: string };

function asRecord(v: unknown): Record<string, unknown> {
  if (typeof v === "object" && v !== null && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  throw new Error("contextJson is not an object");
}

export async function executeDeferredAction(
  approvalRequest: {
    requestorId: string;
    actionKind:  string;
    contextJson: unknown;
  },
  guardianActorId: string
): Promise<DeferredResult> {
  const ctx = asRecord(approvalRequest.contextJson);
  const { requestorId } = approvalRequest;

  const requestor = await prisma.user.findUnique({
    where:  { id: requestorId },
    select: { id: true, status: true, role: true, email: true },
  });
  if (!requestor || requestor.status !== "active") {
    return { ok: false, reason: "requestor_inactive" };
  }

  const action = String(ctx.action ?? "");

  switch (action) {
    case "create_family_unit": {
      const name = String(ctx.name ?? "");
      // memberIds not re-applied — Blocker 4: pre-adding members without consent is disallowed.
      const familyUnit = await prisma.aihFamilyUnit.create({
        data: {
          name,
          createdByUserId: requestorId,
          members: { create: [{ userId: requestorId, role: "guardian" }] },
        },
      });
      await emitAuditEvent({
        kind:     AuditEventKind.FAMILY_UNIT_CREATED,
        actorId:  requestorId,
        targetId: familyUnit.id,
        meta:     { name, guardianApprovedBy: guardianActorId },
      });
      return { ok: true };
    }

    case "create_trust_unit": {
      if (!isHumanTrustEligible({ role: requestor.role, email: requestor.email })) {
        return { ok: false, reason: "requestor_not_human_trust_eligible" };
      }
      const metaKind = String(ctx.kind ?? "peer") as TrustUnitKind;
      const vsRaw    = ctx.vaultSpaceType != null ? String(ctx.vaultSpaceType) : "";
      const VAULT    = new Set<string>(["FAMILY", "BUSINESS", "CHURCH", "CLUB", "PRIVATE", "CUSTOM"]);
      const vaultSpaceType: VaultSpaceType = VAULT.has(vsRaw)
        ? (vsRaw as VaultSpaceType)
        : deriveVaultSpaceTypeFromTrustKind(metaKind);
      const name                   = ctx.name != null ? String(ctx.name) : undefined;
      const description          = ctx.description != null ? String(ctx.description) : undefined;
      const defaultVisibilityScope = String(ctx.defaultVisibilityScope ?? "trust_unit");
      const maxMemberCount         = typeof ctx.maxMemberCount === "number" ? ctx.maxMemberCount : 3;
      // memberIds not re-applied — see Blocker 4.
      const trustUnit = await prisma.trustUnit.create({
        data: {
          members: { create: [{ userId: requestorId }] },
          aihMeta: {
            create: {
              kind:              metaKind,
              vaultSpaceType,
              name:              name ?? null,
              description:       description ?? null,
              defaultVisibilityScope,
              maxMemberCount,
            },
          },
        },
      });
      await emitAuditEvent({
        kind:     AuditEventKind.TRUST_UNIT_FORMED,
        actorId:  requestorId,
        targetId: trustUnit.id,
        meta:     { kind: metaKind, vaultSpaceType, guardianApprovedBy: guardianActorId },
      });
      return { ok: true };
    }

    case "join_trust_unit": {
      if (!isHumanTrustEligible({ role: requestor.role, email: requestor.email })) {
        return { ok: false, reason: "requestor_not_human_trust_eligible" };
      }
      const trustUnitId = String(ctx.trustUnitId ?? "");
      const existing    = await prisma.trustUnitMember.findFirst({
        where: { trustUnitId, userId: requestorId },
      });
      if (!existing) {
        const membership = await prisma.trustUnitMember.create({
          data: { trustUnitId, userId: requestorId },
        });
        await emitAuditEvent({
          kind:     AuditEventKind.MEMBERSHIP_GRANTED,
          actorId:  requestorId,
          targetId: trustUnitId,
          meta:     { membershipId: membership.id, guardianApprovedBy: guardianActorId },
        });
      }
      return { ok: true };
    }

    case "invite_member": {
      const recipientEmail = String(ctx.recipientEmail ?? "").trim().toLowerCase();
      const relationship   = ctx.relationship != null ? String(ctx.relationship) : null;
      const targetId       = String(ctx.trustUnitId ?? ctx.familyUnitId ?? "");
      const deferredTrustUnitId =
        typeof ctx.trustUnitId === "string" ? ctx.trustUnitId.trim() : "";

      if (deferredTrustUnitId) {
        const inviteTarget = await prisma.user.findFirst({
          where: { email: { equals: recipientEmail, mode: "insensitive" } },
          select: { role: true, email: true },
        });
        if (inviteTarget && !isHumanTrustEligible({ role: inviteTarget.role, email: inviteTarget.email })) {
          return { ok: false, reason: "recipient_not_human_trust_eligible" };
        }
      }

      // Idempotent: skip if a pending invite already exists (guardian may retry).
      const existingInvite = await prisma.invite.findFirst({
        where: {
          senderId:       requestorId,
          recipientEmail: { equals: recipientEmail, mode: "insensitive" },
          status:         "PENDING",
        },
      });
      if (!existingInvite) {
        await prisma.invite.create({
          data: {
            senderId:       requestorId,
            recipientEmail,
            relationship,
            token:          uuidv4(),
            expiresAt:      new Date(Date.now() + 7 * 86_400_000),
          },
        });
      }
      await emitAuditEvent({
        kind:     AuditEventKind.INVITE_SENT_CHILD,
        actorId:  requestorId,
        targetId: targetId || null,
        meta:     { recipientEmail, relationship, guardianApprovedBy: guardianActorId },
      });
      return { ok: true };
    }

    case "create_activity_post": {
      // Guardian approved a minor's pending post. Create the post now.
      const bodyText        = typeof ctx.bodyText        === "string" ? ctx.bodyText        : null;
      const visibilityScope = typeof ctx.visibilityScope === "string" ? ctx.visibilityScope : "family";
      const trustUnitId     = typeof ctx.trustUnitId     === "string" && ctx.trustUnitId     ? ctx.trustUnitId     : null;
      const familyUnitId    = typeof ctx.familyUnitId    === "string" && ctx.familyUnitId    ? ctx.familyUnitId    : null;
      const attachmentType  = typeof ctx.attachmentType  === "string" && ctx.attachmentType  ? ctx.attachmentType  : null;

      if (!bodyText) {
        return { ok: false, reason: "missing_body_text" };
      }

      // Validate requestor is still a member of the target trust unit.
      // The space may have been dissolved or the child's membership revoked while pending.
      if (trustUnitId) {
        const membership = await prisma.trustUnitMember.findFirst({
          where: { trustUnitId, userId: requestorId },
        });
        if (!membership) {
          return { ok: false, reason: "requestor_not_member_of_trust_unit" };
        }
      }

      const post = await prisma.aihActivityPost.create({
        data: {
          authorId:        requestorId,
          trustUnitId,
          familyUnitId,
          visibilityScope,
          bodyText,
          governanceState: "allowed",
          escalationState: "none",
          attachmentType,
        },
      });

      await emitAuditEvent({
        kind:     AuditEventKind.VISIBILITY_CHANGED,
        actorId:  requestorId,
        targetId: post.id,
        meta: {
          action:             "post_created_via_guardian_approval",
          trustUnitId:        trustUnitId ?? null,
          scope:              visibilityScope,
          guardianApprovedBy: guardianActorId,
        },
      });
      return { ok: true };
    }

    default:
      return { ok: false, reason: `unknown_action:${action}` };
  }
}
