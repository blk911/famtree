// AIH Safe — Guardian Links API
// POST /api/aihsafe/guardian-links — establish a guardian ↔ child relationship
// GET  /api/aihsafe/guardian-links — list guardian relationships for the current actor

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";
import {
  buildActorContext,
  canCreateChildAccount,
  emitAuditEvent,
} from "@/lib/aihsafe";
import { asAIHUserId } from "@/types/aihsafe/ids";
import { AuditEventKind } from "@/types/aihsafe/audit-events";
import { deriveAgeTier } from "@/lib/aihsafe";
import {
  created,
  ok,
  unauthenticated,
  governanceDenied,
  validationFail,
  conflict,
  notFound,
  serverError,
} from "@/lib/aihsafe/api/envelopes";
import { readJson, parsePagination } from "@/lib/aihsafe/api/parse";
import type { GuardianLinkDTO } from "@/types/aihsafe/dto";

// ─── Validation ───────────────────────────────────────────────────────────────

const CreateGuardianLinkSchema = z.object({
  childUserId:     z.string().min(1),
  kind:            z.enum(["parent", "grandparent", "legal_guardian", "trusted_adult"]),
  permissionLevel: z.enum(["view_only", "approver", "full_control"]),
});

// ─── DTO mapper ───────────────────────────────────────────────────────────────

function toGuardianLinkDTO(
  row: {
    id: string;
    guardianUserId: string;
    childUserId: string;
    kind: string;
    permissionLevel: string;
    establishedAt: Date;
    revokedAt: Date | null;
  },
  guardianName: string,
  childName: string
): GuardianLinkDTO {
  return {
    id:              row.id,
    guardianUserId:  row.guardianUserId,
    guardianName,
    childUserId:     row.childUserId,
    childName,
    kind:            row.kind as GuardianLinkDTO["kind"],
    permissionLevel: row.permissionLevel as GuardianLinkDTO["permissionLevel"],
    establishedAt:   row.establishedAt.toISOString(),
    revokedAt:       row.revokedAt?.toISOString() ?? null,
  };
}

// ─── POST — create guardian link ──────────────────────────────────────────────

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
  const parsed = CreateGuardianLinkSchema.safeParse(body);
  if (!parsed.success) {
    const fields = parsed.error.errors.map(e => ({
      path:    e.path.join("."),
      message: e.message,
    }));
    return validationFail("Invalid request body", fields);
  }

  const { childUserId, kind, permissionLevel } = parsed.data;

  // Load target child user to build target context
  const childUser = await prisma.user.findUnique({
    where:  { id: childUserId },
    select: { id: true, firstName: true, lastName: true, dateOfBirth: true, status: true },
  });
  if (!childUser || childUser.status !== "active") {
    return notFound("Child user not found or not active");
  }

  const childAgeTier = deriveAgeTier(childUser.dateOfBirth ?? null);
  const targetContext = {
    targetUserId:  asAIHUserId(childUserId),
    targetAgeTier: childAgeTier,
  };

  const decision = canCreateChildAccount(actor, targetContext);
  if (!decision.allowed) {
    await emitAuditEvent({
      kind:    decision.auditEventType ?? AuditEventKind.GUARDIAN_LINKED,
      actorId: actor.actorUserId as string,
      targetId: childUserId,
      meta:    { reasonCode: decision.reasonCode, denied: true },
    });
    return governanceDenied(decision);
  }

  // Check for existing (non-revoked) link
  const existing = await prisma.aihGuardianRelationship.findUnique({
    where: {
      guardianUserId_childUserId: {
        guardianUserId: user.id,
        childUserId,
      },
    },
  });
  if (existing && existing.revokedAt === null) {
    return conflict("Guardian relationship already exists");
  }

  const guardianName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  const childName    = `${childUser.firstName ?? ""} ${childUser.lastName ?? ""}`.trim();

  const link = await prisma.aihGuardianRelationship.upsert({
    where: {
      guardianUserId_childUserId: {
        guardianUserId: user.id,
        childUserId,
      },
    },
    create: {
      guardianUserId:  user.id,
      childUserId,
      kind,
      permissionLevel,
    },
    update: {
      kind,
      permissionLevel,
      revokedAt: null,
    },
  });

  await emitAuditEvent({
    kind:     AuditEventKind.GUARDIAN_LINKED,
    actorId:  actor.actorUserId as string,
    targetId: childUserId,
    meta:     { linkId: link.id, kind, permissionLevel },
  });

  return created(toGuardianLinkDTO(link, guardianName, childName));
}

// ─── GET — list guardian relationships ───────────────────────────────────────

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

  // Return all relationships where actor is guardian OR child
  const rows = await prisma.aihGuardianRelationship.findMany({
    where: {
      OR: [
        { guardianUserId: user.id },
        { childUserId:    user.id },
      ],
    },
    orderBy: { establishedAt: "desc" },
    take:    limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const items   = hasMore ? rows.slice(0, limit) : rows;

  // Gather user IDs to resolve display names
  const userIds = new Set<string>();
  items.forEach(r => {
    userIds.add(r.guardianUserId);
    userIds.add(r.childUserId);
  });
  const users = await prisma.user.findMany({
    where:  { id: { in: Array.from(userIds) } },
    select: { id: true, firstName: true, lastName: true },
  });
  const nameMap = new Map(
    users.map(u => [u.id, `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()])
  );

  const dtos = items.map(r =>
    toGuardianLinkDTO(
      r,
      nameMap.get(r.guardianUserId) ?? r.guardianUserId,
      nameMap.get(r.childUserId)    ?? r.childUserId
    )
  );

  return ok({
    items:      dtos,
    pagination: {
      cursor:  hasMore ? items[items.length - 1].id : null,
      hasMore,
      total:   null,
    },
  });
}
