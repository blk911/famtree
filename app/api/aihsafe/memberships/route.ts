// AIH Safe — Memberships API
// POST /api/aihsafe/memberships — join a trust unit

import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";
import {
  buildActorContext,
  canJoinTrustUnit,
  emitAuditEvent,
  selectApprovalRecipients,
} from "@/lib/aihsafe";
import { asAIHUserId, asTrustUnitId } from "@/types/aihsafe/ids";
import { AuditEventKind } from "@/types/aihsafe/audit-events";
import {
  approvalExpiresAt,
  accepted,
  created,
  unauthenticated,
  governanceDenied,
  validationFail,
  notFound,
  conflict,
  serverError,
} from "@/lib/aihsafe/api/envelopes";
import { readJson } from "@/lib/aihsafe/api/parse";

// ─── Validation ───────────────────────────────────────────────────────────────

const JoinTrustUnitSchema = z.object({
  trustUnitId: z.string().min(1),
});

// ─── POST — join trust unit ───────────────────────────────────────────────────

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
  const parsed = JoinTrustUnitSchema.safeParse(body);
  if (!parsed.success) {
    const fields = parsed.error.errors.map(e => ({
      path:    e.path.join("."),
      message: e.message,
    }));
    return validationFail("Invalid request body", fields);
  }

  const { trustUnitId } = parsed.data;

  const trustUnit = await prisma.trustUnit.findUnique({
    where:   { id: trustUnitId },
    include: { aihMeta: true },
  });
  if (!trustUnit) return notFound("Trust unit not found");

  // Check for existing membership
  const existingMember = await prisma.trustUnitMember.findFirst({
    where: { trustUnitId, userId: user.id },
  });
  if (existingMember) return conflict("Already a member of this trust unit");

  const targetContext = {
    trustUnitId: asTrustUnitId(trustUnitId),
  };

  const decision = canJoinTrustUnit(actor, targetContext);
  if (!decision.allowed && !decision.requiredApproval) {
    await emitAuditEvent({
      kind:     AuditEventKind.TRUST_UNIT_MEMBER_ADDED,
      actorId:  actor.actorUserId as string,
      targetId: trustUnitId,
      meta:     { reasonCode: decision.reasonCode, denied: true },
    });
    return governanceDenied(decision);
  }

  if (decision.requiredApproval) {
    const eligibleApprovers = selectApprovalRecipients(actor.guardedByRelationships);
    if (eligibleApprovers.length === 0) return governanceDenied(decision);

    const expiresAt  = approvalExpiresAt();
    const contextJson: Prisma.InputJsonValue = {
      action: "join_trust_unit",
      trustUnitId,
    };

    const approvalRequest = await prisma.aihApprovalRequest.create({
      data: {
        requestorId: user.id,
        approverId:  eligibleApprovers[0].guardianUserId as string,
        actionKind:  AuditEventKind.TRUST_UNIT_MEMBER_ADDED,
        contextJson,
        expiresAt,
      },
    });

    await emitAuditEvent({
      kind:     AuditEventKind.TRUST_UNIT_MEMBER_ADDED,
      actorId:  actor.actorUserId as string,
      targetId: trustUnitId,
      meta:     { escalated: true, approvalRequestId: approvalRequest.id },
    });

    return accepted(
      {
        approvalRequestId: approvalRequest.id,
        expiresAt:         expiresAt.toISOString(),
        actionKind:        AuditEventKind.TRUST_UNIT_MEMBER_ADDED,
      },
      decision,
      approvalRequest.id
    );
  }

  const membership = await prisma.trustUnitMember.create({
    data: { trustUnitId, userId: user.id },
  });

  await emitAuditEvent({
    kind:     AuditEventKind.MEMBERSHIP_GRANTED,
    actorId:  actor.actorUserId as string,
    targetId: trustUnitId,
    meta:     { membershipId: membership.id },
  });

  return created({ membershipId: membership.id });
}
