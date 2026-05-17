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
  selectApprovalRecipients,
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
import type { VaultSpaceType } from "@/lib/aihsafe/vault-space";
import {
  deriveVaultSpaceTypeFromTrustKind,
  vaultSpaceTypeToAihMetaKind,
} from "@/lib/aihsafe/vault-space";
import {
  effectiveTrustUnitMaxMembers,
  resolveInitialTrustUnitMemberUserIds,
} from "@/lib/aihsafe/trust-unit-initial-members";

// ─── Validation ───────────────────────────────────────────────────────────────

const VaultSpaceTypeSchema = z.enum([
  "FAMILY",
  "BUSINESS",
  "CHURCH",
  "CLUB",
  "PRIVATE",
  "CUSTOM",
]);

const CreateTrustUnitSchema = z
  .object({
    kind:                   z.enum(["family", "peer", "extended", "guardian"]).optional(),
    vaultSpaceType:         VaultSpaceTypeSchema.optional(),
    name:                   z.string().min(1).max(80).optional(),
    description:            z.string().max(2000).optional(),
    memberIds:              z.array(z.string().min(1)).optional(),
    defaultVisibilityScope: z.string().optional(),
    maxMemberCount:         z.number().int().min(3).max(100).optional(),
  })
  .refine(d => d.kind != null || d.vaultSpaceType != null, {
    message: "Provide vaultSpaceType or kind",
    path:    ["vaultSpaceType"],
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
      name: string | null;
      description: string | null;
      vaultSpaceType: string | null;
      defaultVisibilityScope: string;
      maxMemberCount: number;
    } | null;
  },
  memberNames: Map<string, string>
): TrustUnitDTO {
  const kind = (row.aihMeta?.kind ?? "peer") as TrustUnitKind;
  const vaultSpaceType: VaultSpaceType =
    row.aihMeta?.vaultSpaceType != null
      ? (row.aihMeta.vaultSpaceType as VaultSpaceType)
      : deriveVaultSpaceTypeFromTrustKind(kind);

  return {
    id:                     row.id,
    ...(row.aihMeta?.name ? { name: row.aihMeta.name } : {}),
    ...(row.aihMeta?.description ? { description: row.aihMeta.description } : {}),
    kind,
    vaultSpaceType,
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
    kind:               legacyKind,
    vaultSpaceType:   bodyVaultType,
    name,
    description,
    memberIds = [],
    defaultVisibilityScope = "trust_unit",
    maxMemberCount = 3,
  } = parsed.data;

  const vaultSpaceType: VaultSpaceType = bodyVaultType
    ?? deriveVaultSpaceTypeFromTrustKind((legacyKind ?? "peer") as TrustUnitKind);

  const metaKind = (
    bodyVaultType
      ? vaultSpaceTypeToAihMetaKind(bodyVaultType)
      : (legacyKind ?? "peer")
  ) as TrustUnitKind;

  const decision = canCreateTrustUnit(actor, { kind: metaKind as TrustUnitKind });
  if (!decision.allowed && !decision.requiredApproval) {
    await emitAuditEvent({
      kind:     AuditEventKind.TRUST_UNIT_FORMED,
      actorId:  actor.actorUserId as string,
      targetId: null,
      meta:     { kind: metaKind, vaultSpaceType, reasonCode: decision.reasonCode, denied: true },
    });
    return governanceDenied(decision);
  }

  if (decision.requiredApproval) {
    const eligibleApprovers = selectApprovalRecipients(actor.guardedByRelationships);
    if (eligibleApprovers.length === 0) return governanceDenied(decision);

    const expiresAt  = approvalExpiresAt();
    const contextJson: Prisma.InputJsonValue = {
      action:       "create_trust_unit",
      kind:         metaKind,
      vaultSpaceType,
      name:         name ?? null,
      description:  description ?? null,
      memberIds,
      defaultVisibilityScope,
      maxMemberCount,
    };

    const approvalRequests = await Promise.all(
      eligibleApprovers.map(g =>
        prisma.aihApprovalRequest.create({
          data: {
            requestorId: user.id,
            approverId:  g.guardianUserId as string,
            actionKind:  AuditEventKind.TRUST_UNIT_FORMED,
            contextJson,
            expiresAt,
          },
        })
      )
    );
    const approvalRequest = approvalRequests[0];

    await emitAuditEvent({
      kind:     AuditEventKind.TRUST_UNIT_FORMED,
      actorId:  actor.actorUserId as string,
      targetId: null,
      meta:     {
        kind:               metaKind,
        vaultSpaceType,
        escalated:          true,
        approvalRequestId:  approvalRequest.id,
        guardianCount:      approvalRequests.length,
      },
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

  const initialMemberUserIds = await resolveInitialTrustUnitMemberUserIds(user.id, memberIds);
  const effectiveMax         = effectiveTrustUnitMaxMembers(maxMemberCount, initialMemberUserIds.length);

  const trustUnit = await prisma.trustUnit.create({
    data: {
      members: {
        create: initialMemberUserIds.map(uid => ({ userId: uid })),
      },
      aihMeta: {
        create: {
          kind:              metaKind,
          vaultSpaceType,
          name:              name ?? null,
          description:       description ?? null,
          defaultVisibilityScope,
          maxMemberCount:    effectiveMax,
        },
      },
    },
    include: { members: true, aihMeta: true },
  });

  await emitAuditEvent({
    kind:     AuditEventKind.TRUST_UNIT_FORMED,
    actorId:  actor.actorUserId as string,
    targetId: trustUnit.id,
    meta:     { kind: metaKind, vaultSpaceType, memberCount: trustUnit.members.length },
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
