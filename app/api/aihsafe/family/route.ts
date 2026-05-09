// AIH Safe — Family Unit API
// POST /api/aihsafe/family — create a family unit
// GET  /api/aihsafe/family — list family units for the current actor

import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";
import {
  buildActorContext,
  canCreateTrustUnit,
  emitAuditEvent,
  selectApprovalRecipients,
} from "@/lib/aihsafe";
import { asAIHUserId } from "@/types/aihsafe/ids";
import { AuditEventKind } from "@/types/aihsafe/audit-events";
import { approvalExpiresAt, accepted, created, ok, unauthenticated, governanceDenied, validationFail, serverError } from "@/lib/aihsafe/api/envelopes";
import { readJson, parsePagination } from "@/lib/aihsafe/api/parse";
import type { FamilyUnitDTO } from "@/types/aihsafe/dto";

// ─── Validation ───────────────────────────────────────────────────────────────

const CreateFamilyUnitSchema = z.object({
  name:      z.string().min(1).max(80),
  memberIds: z.array(z.string().min(1)).optional(),
});

// ─── DTO mapper ───────────────────────────────────────────────────────────────

function toFamilyUnitDTO(
  row: {
    id: string;
    name: string;
    status: string;
    createdByUserId: string;
    createdAt: Date;
    dissolvedAt: Date | null;
    members: Array<{
      id: string;
      userId: string;
      role: string;
      joinedAt: Date;
      exitedAt: Date | null;
    }>;
  },
  memberNames: Map<string, string>
): FamilyUnitDTO {
  return {
    id:              row.id,
    name:            row.name,
    status:          row.status as "active" | "dissolved",
    createdByUserId: row.createdByUserId,
    createdAt:       row.createdAt.toISOString(),
    dissolvedAt:     row.dissolvedAt?.toISOString() ?? null,
    members:         row.members.map(m => ({
      id:          m.id,
      userId:      m.userId,
      displayName: memberNames.get(m.userId) ?? m.userId,
      role:        m.role as "guardian" | "child" | "adult",
      joinedAt:    m.joinedAt.toISOString(),
      exitedAt:    m.exitedAt?.toISOString() ?? null,
    })),
  };
}

// ─── POST — create family unit ────────────────────────────────────────────────

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
  const parsed = CreateFamilyUnitSchema.safeParse(body);
  if (!parsed.success) {
    const fields = parsed.error.errors.map(e => ({
      path:    e.path.join("."),
      message: e.message,
    }));
    return validationFail("Invalid request body", fields);
  }

  const { name, memberIds = [] } = parsed.data;

  // Gate: reuse canCreateTrustUnit with family kind — same age-tier rules apply.
  const decision = canCreateTrustUnit(actor, { kind: "family" });
  if (!decision.allowed && !decision.requiredApproval) {
    await emitAuditEvent({
      kind:     AuditEventKind.FAMILY_UNIT_CREATED,
      actorId:  actor.actorUserId as string,
      targetId: null,
      meta:     { name, reasonCode: decision.reasonCode, denied: true },
    });
    return governanceDenied(decision);
  }

  if (decision.requiredApproval) {
    const eligibleApprovers = selectApprovalRecipients(actor.guardedByRelationships);

    if (eligibleApprovers.length === 0) {
      return governanceDenied(decision);
    }

    const expiresAt = approvalExpiresAt();
    const contextJson: Prisma.InputJsonValue = {
      action: "create_family_unit",
      name,
      memberIds,
    };

    const approvalRequest = await prisma.aihApprovalRequest.create({
      data: {
        requestorId: user.id,
        approverId:  eligibleApprovers[0].guardianUserId as string,
        actionKind:  AuditEventKind.FAMILY_UNIT_CREATED,
        contextJson,
        expiresAt,
      },
    });

    await emitAuditEvent({
      kind:     AuditEventKind.FAMILY_UNIT_CREATED,
      actorId:  actor.actorUserId as string,
      targetId: null,
      meta:     { name, escalated: true, approvalRequestId: approvalRequest.id },
    });

    return accepted(
      {
        approvalRequestId: approvalRequest.id,
        expiresAt:         expiresAt.toISOString(),
        actionKind:        AuditEventKind.FAMILY_UNIT_CREATED,
      },
      decision,
      approvalRequest.id
    );
  }

  // Create family unit + creator member + any additional members
  const familyUnit = await prisma.aihFamilyUnit.create({
    data: {
      name,
      createdByUserId: user.id,
      members: {
        create: [
          { userId: user.id, role: "guardian" },
          ...memberIds
            .filter(id => id !== user.id)
            .map(id => ({ userId: id, role: "adult" as const })),
        ],
      },
    },
    include: { members: true },
  });

  await emitAuditEvent({
    kind:     AuditEventKind.FAMILY_UNIT_CREATED,
    actorId:  actor.actorUserId as string,
    targetId: familyUnit.id,
    meta:     { name, memberCount: familyUnit.members.length },
  });

  const memberUserIds = familyUnit.members.map(m => m.userId);
  const memberUsers   = await prisma.user.findMany({
    where:  { id: { in: memberUserIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const nameMap = new Map(
    memberUsers.map(u => [u.id, `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()])
  );

  return created(toFamilyUnitDTO(familyUnit, nameMap));
}

// ─── GET — list family units ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthenticated();
  }

  const actor = await buildActorContext(asAIHUserId(user.id)).catch(() => null);
  if (!actor) return serverError("Failed to build actor context");

  const { cursor, limit } = parsePagination(req);

  const rows = await prisma.aihFamilyUnit.findMany({
    where: {
      members: { some: { userId: user.id, exitedAt: null } },
    },
    include:  { members: true },
    orderBy:  { createdAt: "desc" },
    take:     limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const items   = hasMore ? rows.slice(0, limit) : rows;

  const allMemberIds = Array.from(new Set(items.flatMap(u => u.members.map(m => m.userId))));
  const allUsers     = await prisma.user.findMany({
    where:  { id: { in: allMemberIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const nameMap = new Map(
    allUsers.map(u => [u.id, `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()])
  );

  return ok({
    items:      items.map(r => toFamilyUnitDTO(r, nameMap)),
    pagination: {
      cursor:  hasMore ? items[items.length - 1].id : null,
      hasMore,
      total:   null,
    },
  });
}
