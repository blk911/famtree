// AIH Safe — Approvals API
// GET  /api/aihsafe/approvals — guardian inbox (pending approval requests)
// POST /api/aihsafe/approvals — resolve an approval request (approve or deny)

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";
import {
  buildActorContext,
  canApproveChildAction,
  emitAuditEvent,
} from "@/lib/aihsafe";
import { asAIHUserId } from "@/types/aihsafe/ids";
import { AuditEventKind } from "@/types/aihsafe/audit-events";
import {
  ok,
  unauthenticated,
  governanceDenied,
  validationFail,
  notFound,
  conflict,
  serverError,
} from "@/lib/aihsafe/api/envelopes";
import { readJson, parsePagination } from "@/lib/aihsafe/api/parse";
import type { ApprovalRequestDTO } from "@/types/aihsafe/dto";

// ─── Validation ───────────────────────────────────────────────────────────────

const ResolveApprovalSchema = z.object({
  requestId: z.string().min(1),
  action:    z.enum(["approve", "deny"]),
  note:      z.string().max(500).optional(),
});

// ─── DTO mapper ───────────────────────────────────────────────────────────────

function toApprovalDTO(
  row: {
    id: string;
    requestorId: string;
    approverId: string;
    actionKind: string;
    state: string;
    expiresAt: Date;
    resolvedAt: Date | null;
    createdAt: Date;
  },
  requestorName: string
): ApprovalRequestDTO {
  return {
    id:            row.id,
    requestorId:   row.requestorId,
    requestorName,
    approverId:    row.approverId,
    actionKind:    row.actionKind,
    state:         row.state as ApprovalRequestDTO["state"],
    expiresAt:     row.expiresAt.toISOString(),
    resolvedAt:    row.resolvedAt?.toISOString() ?? null,
    createdAt:     row.createdAt.toISOString(),
  };
}

// ─── GET — guardian inbox ─────────────────────────────────────────────────────

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
  const url    = new URL(req.url);
  const stateFilter = url.searchParams.get("state") ?? "pending";

  const rows = await prisma.aihApprovalRequest.findMany({
    where: {
      approverId: user.id,
      state:      stateFilter as "pending" | "approved" | "denied" | "revoked" | "expired",
    },
    orderBy: { createdAt: "desc" },
    take:    limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const items   = hasMore ? rows.slice(0, limit) : rows;

  const requestorIds = Array.from(new Set(items.map(r => r.requestorId)));
  const requestors   = await prisma.user.findMany({
    where:  { id: { in: requestorIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const nameMap = new Map(
    requestors.map(u => [u.id, `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()])
  );

  const dtos = items.map(r =>
    toApprovalDTO(r, nameMap.get(r.requestorId) ?? r.requestorId)
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

// ─── POST — resolve approval ──────────────────────────────────────────────────

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
  const parsed = ResolveApprovalSchema.safeParse(body);
  if (!parsed.success) {
    const fields = parsed.error.errors.map(e => ({
      path:    e.path.join("."),
      message: e.message,
    }));
    return validationFail("Invalid request body", fields);
  }

  const { requestId, action, note } = parsed.data;

  const approvalRequest = await prisma.aihApprovalRequest.findUnique({
    where: { id: requestId },
  });
  if (!approvalRequest) return notFound("Approval request not found");
  if (approvalRequest.approverId !== user.id) return notFound("Approval request not found");
  if (approvalRequest.state !== "pending") {
    return conflict(`Approval request is already ${approvalRequest.state}`);
  }
  if (approvalRequest.expiresAt < new Date()) {
    return conflict("Approval request has expired");
  }

  // Build target context from the requestor
  const targetContext = {
    targetUserId:  asAIHUserId(approvalRequest.requestorId),
    approvalState: "pending" as const,
  };
  const decision = canApproveChildAction(actor, targetContext);
  if (!decision.allowed) {
    await emitAuditEvent({
      kind:     AuditEventKind.GUARDIAN_CONSENT_DENIED,
      actorId:  actor.actorUserId as string,
      targetId: approvalRequest.requestorId,
      meta:     { requestId, reasonCode: decision.reasonCode, denied: true },
    });
    return governanceDenied(decision);
  }

  const newState    = action === "approve" ? "approved" : "denied";
  const auditKind   = action === "approve"
    ? AuditEventKind.GUARDIAN_CONSENT_GIVEN
    : AuditEventKind.GUARDIAN_CONSENT_DENIED;

  const updated = await prisma.aihApprovalRequest.update({
    where: { id: requestId },
    data:  {
      state:      newState,
      resolvedAt: new Date(),
    },
  });

  await emitAuditEvent({
    kind:     auditKind,
    actorId:  actor.actorUserId as string,
    targetId: approvalRequest.requestorId,
    meta:     { requestId, action, note: note ?? null, actionKind: approvalRequest.actionKind },
  });

  const requestorUser = await prisma.user.findUnique({
    where:  { id: approvalRequest.requestorId },
    select: { firstName: true, lastName: true },
  });
  const requestorName = requestorUser
    ? `${requestorUser.firstName ?? ""} ${requestorUser.lastName ?? ""}`.trim()
    : approvalRequest.requestorId;

  return ok(toApprovalDTO(updated, requestorName));
}
