// AIH Safe — Membership Lifecycle API
// PATCH  /api/aihsafe/memberships/[id] — exit / remove / promote / demote a trust unit member
// DELETE /api/aihsafe/memberships/[id] — exit (self) or remove (managed) a trust unit member
//
// Schema note: TrustUnitMember has no `exitedAt` or `role` column (Phase 4 gap).
// Soft-delete is therefore not available; exit/remove uses hard delete.
// Role promote/demote is gated but blocked at write time until Phase 4 schema migration.

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";
import {
  buildActorContext,
  canManageMembership,
  canExitMembership,
  emitAuditEvent,
} from "@/lib/aihsafe";
import { asAIHUserId, asTrustUnitId } from "@/types/aihsafe/ids";
import { AuditEventKind } from "@/types/aihsafe/audit-events";
import {
  ok,
  unauthenticated,
  governanceDenied,
  validationFail,
  notFound,
  conflict,
  unprocessable,
  serverError,
} from "@/lib/aihsafe/api/envelopes";
import { readJson } from "@/lib/aihsafe/api/parse";

// A trust unit with one member is effectively dissolved once that member exits.
// Prevent the last member from leaving so the unit stays recoverable.
const MIN_MEMBER_COUNT = 1;

// ─── Validation ───────────────────────────────────────────────────────────────

const ManageMembershipSchema = z.object({
  action: z.enum(["exit", "remove", "promote", "demote"]),
  role:   z.enum(["creator", "member", "moderator"]).optional(),
});

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function loadMembership(id: string) {
  return prisma.trustUnitMember.findUnique({ where: { id } });
}

async function isLastMember(trustUnitId: string): Promise<boolean> {
  const count = await prisma.trustUnitMember.count({ where: { trustUnitId } });
  return count <= MIN_MEMBER_COUNT;
}

async function hardDelete(id: string): Promise<void> {
  await prisma.trustUnitMember.delete({ where: { id } });
}

// ─── PATCH — manage membership ────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  routeCtx: { params: { id: string } }
) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthenticated();
  }

  const actor = await buildActorContext(asAIHUserId(user.id)).catch(() => null);
  if (!actor) return serverError("Failed to build actor context");

  const body = await readJson(req);
  const parsed = ManageMembershipSchema.safeParse(body);
  if (!parsed.success) {
    const fields = parsed.error.errors.map(e => ({
      path:    e.path.join("."),
      message: e.message,
    }));
    return validationFail("Invalid request body", fields);
  }

  const { action } = parsed.data;
  const { id: membershipId } = routeCtx.params;

  const membership = await loadMembership(membershipId);
  if (!membership) return notFound("Membership not found");

  const isSelf      = membership.userId === user.id;
  const trustUnitId = asTrustUnitId(membership.trustUnitId);

  // ── exit ─────────────────────────────────────────────────────────────────────
  if (action === "exit") {
    if (!isSelf) {
      return validationFail("Use action \"remove\" to remove another member's membership.");
    }
    if (await isLastMember(membership.trustUnitId)) {
      return conflict(
        "Cannot exit as the last member of a trust unit. " +
        "Add another member or dissolve the unit first."
      );
    }
    const decision = canExitMembership(actor, { trustUnitId });
    if (!decision.allowed) {
      await emitAuditEvent({
        kind:     AuditEventKind.MEMBERSHIP_REVOKED,
        actorId:  actor.actorUserId as string,
        targetId: membership.trustUnitId,
        meta:     { membershipId, reasonCode: decision.reasonCode, denied: true, action },
      });
      return governanceDenied(decision);
    }
    await hardDelete(membershipId);
    await emitAuditEvent({
      kind:     AuditEventKind.MEMBERSHIP_REVOKED,
      actorId:  actor.actorUserId as string,
      targetId: membership.trustUnitId,
      meta:     { membershipId, action: "exit" },
    });
    return ok({ membershipId });
  }

  // ── remove ────────────────────────────────────────────────────────────────────
  if (action === "remove") {
    const decision = canManageMembership(actor, { trustUnitId });
    if (!decision.allowed && !decision.requiredApproval) {
      await emitAuditEvent({
        kind:     AuditEventKind.MEMBERSHIP_REVOKED,
        actorId:  actor.actorUserId as string,
        targetId: membership.trustUnitId,
        meta:     { membershipId, reasonCode: decision.reasonCode, denied: true, action },
      });
      return governanceDenied(decision);
    }
    if (await isLastMember(membership.trustUnitId)) {
      return conflict("Cannot remove the last member of a trust unit.");
    }
    await hardDelete(membershipId);
    await emitAuditEvent({
      kind:     AuditEventKind.MEMBERSHIP_REVOKED,
      actorId:  actor.actorUserId as string,
      targetId: membership.trustUnitId,
      meta:     { membershipId, removedUserId: membership.userId, action: "remove" },
    });
    return ok({ membershipId, removedUserId: membership.userId });
  }

  // ── promote / demote ──────────────────────────────────────────────────────────
  // Governance gate is enforced; the actual role write is blocked until Phase 4
  // adds a `role` column to TrustUnitMember. Return 422 with a clear message.
  const decision = canManageMembership(actor, { trustUnitId });
  if (!decision.allowed && !decision.requiredApproval) {
    await emitAuditEvent({
      kind:     AuditEventKind.MEMBERSHIP_GRANTED,
      actorId:  actor.actorUserId as string,
      targetId: membership.trustUnitId,
      meta:     { membershipId, reasonCode: decision.reasonCode, denied: true, action },
    });
    return governanceDenied(decision);
  }
  // Governance passed but TrustUnitMember has no role column yet.
  return unprocessable(
    `Action "${action}" requires a role column on TrustUnitMember. ` +
    "This column is planned for Phase 4 schema migration."
  );
}

// ─── DELETE — exit (self) or remove (managed) ─────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  routeCtx: { params: { id: string } }
) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthenticated();
  }

  const actor = await buildActorContext(asAIHUserId(user.id)).catch(() => null);
  if (!actor) return serverError("Failed to build actor context");

  const { id: membershipId } = routeCtx.params;

  const membership = await loadMembership(membershipId);
  if (!membership) return notFound("Membership not found");

  const isSelf      = membership.userId === user.id;
  const trustUnitId = asTrustUnitId(membership.trustUnitId);

  if (isSelf) {
    // Self-exit: any active member may leave their own membership.
    if (await isLastMember(membership.trustUnitId)) {
      return conflict(
        "Cannot exit as the last member of a trust unit. " +
        "Add another member or dissolve the unit first."
      );
    }
    const decision = canExitMembership(actor, { trustUnitId });
    if (!decision.allowed) {
      await emitAuditEvent({
        kind:     AuditEventKind.MEMBERSHIP_REVOKED,
        actorId:  actor.actorUserId as string,
        targetId: membership.trustUnitId,
        meta:     { membershipId, reasonCode: decision.reasonCode, denied: true, action: "self-exit" },
      });
      return governanceDenied(decision);
    }
    await hardDelete(membershipId);
    await emitAuditEvent({
      kind:     AuditEventKind.MEMBERSHIP_REVOKED,
      actorId:  actor.actorUserId as string,
      targetId: membership.trustUnitId,
      meta:     { membershipId, action: "self-exit" },
    });
    return ok({ membershipId });
  }

  // Managed-remove: actor must have CREATOR/MODERATOR role in the trust unit.
  // NOTE: canManageMembership will deny when TrustUnitMember has no role column
  // (all memberships read as "member" from the graph service). This becomes fully
  // functional once Phase 4 adds the role column and data is back-filled.
  const decision = canManageMembership(actor, { trustUnitId });
  if (!decision.allowed && !decision.requiredApproval) {
    await emitAuditEvent({
      kind:     AuditEventKind.MEMBERSHIP_REVOKED,
      actorId:  actor.actorUserId as string,
      targetId: membership.trustUnitId,
      meta:     { membershipId, reasonCode: decision.reasonCode, denied: true, action: "managed-remove" },
    });
    return governanceDenied(decision);
  }

  if (await isLastMember(membership.trustUnitId)) {
    return conflict("Cannot remove the last member of a trust unit.");
  }
  await hardDelete(membershipId);
  await emitAuditEvent({
    kind:     AuditEventKind.MEMBERSHIP_REVOKED,
    actorId:  actor.actorUserId as string,
    targetId: membership.trustUnitId,
    meta:     { membershipId, removedUserId: membership.userId, action: "managed-remove" },
  });
  return ok({ membershipId, removedUserId: membership.userId });
}
