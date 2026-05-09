// AIH Safe — Trust Units API
// POST /api/aihsafe/trust-units — create a trust unit
// GET  /api/aihsafe/trust-units — list trust units for the current actor

import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";
import {
  buildActorContext,
  canCreateTrustUnit,
  emitAuditEvent,
  listTrustUnitsForUser,
} from "@/lib/aihsafe";
import { asAIHUserId } from "@/types/aihsafe/ids";
import { AuditEventKind } from "@/types/aihsafe/audit-events";
import {
  approvalExpiresAt,
  accepted,
  created,
  ok,
  unauthenticated,
  governanceDenied,
  validationFail,
  serverError,
} from "@/lib/aihsafe/api/envelopes";
import { readJson, parsePagination } from "@/lib/aihsafe/api/parse";
import type { TrustUnitDTO } from "@/types/aihsafe/dto";
import type { TrustUnitKind } from "@/types/aihsafe/trust-units";
import type { VisibilityScope } from "@/types/aihsafe/visibility";

// ─── Validation ───────────────────────────────────────────────────────────────

const CreateTrustUnitSchema = z.object({
  kind:                    z.enum(["family", "peer", "extended", "guardian"]),
  name:                    z.string().min(1).max(80).optional(),
  memberIds:               z.array(z.string().min(1)).optional(),
  defaultVisibilityScope:  z.string().optional(),
  maxMemberCount:          z.number().int().min(3).max(100).optional(),
});

// ─── DTO mapper ───────────────────────────────────────────────────────────────

function toTrustUnitDTO(
  row: {
    id: string;
    createdAt: Date;
    dissolvedAt?: Date | null;
    members: Array<{
      id: string;
      userId: string;
      createdAt: Date;
    }>;
    aihMeta: {
      kind: string;
      defaultVisibilityScope: string;
      maxMemberCount: number;
    } | null;
  },
  memberNames: Map<string, string>
): TrustUnitDTO {
  return {
    id:                     row.id,
    kind:                   (row.aihMeta?.kind ?? "peer") as TrustUnitKind,
    status:                 "active",
    defaultVisibilityScope: (row.aihMeta?.defaultVisibilityScope ?? "trust_unit") as VisibilityScope,
    maxMemberCount:         row.aihMeta?.maxMemberCount ?? 3,
    createdAt:              row.createdAt.toISOString(),
    dissolvedAt:            row.dissolvedAt?.toISOString() ?? null,
    members:                row.members.map(m => ({
      id:          m.id,
      userId:      m.userId,
      displayName: memberNames.get(m.userId) ?? m.userId,
      role:        "member" as const,
      joinedAt:    m.createdAt.toISOString(),
      exitedAt:    null,
    })),
  };
}

// ─── POST — create trust unit ─────────────────────────────────────────────────

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
  const parsed = CreateTrustUnitSchema.safeParse(body);
  if (!parsed.success) {
    const fields = parsed.error.errors.map(e => ({
      path:    e.path.join("."),
      message: e.message,
    }));
    return validationFail("Invalid request body", fields);
  }

  const {
    kind,
    name,
    memberIds = [],
    defaultVisibilityScope = "trust_unit",
    maxMemberCount = 3,
  } = parsed.data;

  const decision = canCreateTrustUnit(actor, { kind: kind as TrustUnitKind });
  if (!decision.allowed && !decision.requiredApproval) {
    await emitAuditEvent({
      kind:     AuditEventKind.TRUST_UNIT_FORMED,
      actorId:  actor.actorUserId as string,
      targetId: null,
      meta:     { kind, reasonCode: decision.reasonCode, denied: true },
    });
    return governanceDenied(decision);
  }

  if (decision.requiredApproval) {
    const eligibleApprovers = actor.guardedByRelationships.filter(r =>
      r.revokedAt === null &&
      (r.permissionLevel === "approver" || r.permissionLevel === "full_control")
    );
    if (eligibleApprovers.length === 0) return governanceDenied(decision);

    const expiresAt  = approvalExpiresAt();
    const contextJson: Prisma.InputJsonValue = {
      action: "create_trust_unit",
      kind,
      name:   name ?? null,
      memberIds,
      defaultVisibilityScope,
      maxMemberCount,
    };

    const approvalRequest = await prisma.aihApprovalRequest.create({
      data: {
        requestorId: user.id,
        approverId:  eligibleApprovers[0].guardianUserId as string,
        actionKind:  AuditEventKind.TRUST_UNIT_FORMED,
        contextJson,
        expiresAt,
      },
    });

    await emitAuditEvent({
      kind:     AuditEventKind.TRUST_UNIT_FORMED,
      actorId:  actor.actorUserId as string,
      targetId: null,
      meta:     { kind, escalated: true, approvalRequestId: approvalRequest.id },
    });

    return accepted(
      {
        approvalRequestId: approvalRequest.id,
        expiresAt:         expiresAt.toISOString(),
        actionKind:        AuditEventKind.TRUST_UNIT_FORMED,
      },
      decision,
      approvalRequest.id
    );
  }

  // Create TrustUnit + AihTrustUnitMeta sidecar + creator member
  const trustUnit = await prisma.trustUnit.create({
    data: {
      ...(name ? { name } : {}),
      members: {
        create: [
          { userId: user.id },
          ...memberIds.filter(id => id !== user.id).map(id => ({ userId: id })),
        ],
      },
      aihMeta: {
        create: { kind, defaultVisibilityScope, maxMemberCount },
      },
    },
    include: { members: true, aihMeta: true },
  });

  await emitAuditEvent({
    kind:     AuditEventKind.TRUST_UNIT_FORMED,
    actorId:  actor.actorUserId as string,
    targetId: trustUnit.id,
    meta:     { kind, memberCount: trustUnit.members.length },
  });

  const memberUserIds = trustUnit.members.map(m => m.userId);
  const memberUsers   = await prisma.user.findMany({
    where:  { id: { in: memberUserIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const nameMap = new Map(
    memberUsers.map(u => [u.id, `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()])
  );

  return created(toTrustUnitDTO(trustUnit, nameMap));
}

// ─── GET — list trust units ───────────────────────────────────────────────────

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

  const rows = await prisma.trustUnit.findMany({
    where:   { members: { some: { userId: user.id } } },
    include: { members: true, aihMeta: true },
    orderBy: { createdAt: "desc" },
    take:    limit + 1,
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
    items:      items.map(r => toTrustUnitDTO(r, nameMap)),
    pagination: {
      cursor:  hasMore ? items[items.length - 1].id : null,
      hasMore,
      total:   null,
    },
  });
}
