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

// Valid state values for the ?state= query param — validated server-side, not cast.
const VALID_APPROVAL_STATES = ["pending", "approved", "denied", "revoked", "expired"] as const;
type ApprovalStateFilter = (typeof VALID_APPROVAL_STATES)[number];

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
  const url = new URL(req.url);

  // Validate ?state= against known values; default to "pending" for invalid input.
  const rawState = url.searchParams.get("state") ?? "pending";
  const stateFilter: ApprovalStateFilter = (
    VALID_APPROVAL_STATES as readonly string[]
  ).includes(rawState)
    ? (rawState as ApprovalStateFilter)
    : "pending";

  const rows = await prisma.aihApprovalRequest.findMany({
    where: {
      approverId: user.id,
      state:      stateFilter,
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

  // Load the request and verify this actor is the assigned approver.
  // Return 404 (not 403) when the record belongs to another approver — prevents
  // enumeration of other guardians' inboxes.
  const approvalRequest = await prisma.aihApprovalRequest.findUnique({
    where: { id: requestId },
  });
  if (!approvalRequest) return notFound("Approval request not found");
  if (approvalRequest.approverId !== user.id) return notFound("Approval request not found");

  // Fast-fail guard on terminal states (readable error before the atomic path).
  if (approvalRequest.state !== "pending") {
    return conflict(`Approval request is already ${approvalRequest.state}`);
  }
  if (approvalRequest.expiresAt < new Date()) {
    return conflict("Approval request has expired");
  }

  // Governance gate: verify actor has active guardian authority over the requestor.
  // This guards against: (a) VIEW_ONLY guardians, (b) revoked guardian relationships.
  // The approverId check above already scopes to the assigned guardian, but the
  // governance gate provides a second layer using live ActorContext data.
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

  const newState   = action === "approve" ? "approved" : "denied";
  const resolvedAt = new Date();

  // Atomic state transition: only succeeds if the row is still "pending".
  // Prevents double-resolution when multiple guardians respond concurrently
  // (TOCTOU: the fast-fail guard above is non-atomic; this updateMany is).
  const updateResult = await prisma.aihApprovalRequest.updateMany({
    where: { id: requestId, state: "pending" },
    data:  { state: newState, resolvedAt },
  });

  if (updateResult.count === 0) {
    // Another guardian resolved this request between our read and this write.
    return conflict("Approval request was already resolved by another guardian");
  }

  // Revoke all other pending requests for the same requestor + action.
  // This handles the multi-guardian fan-out scenario (Phase 4):
  // when multiple AihApprovalRequests are created for the same action,
  // the first guardian to resolve wins; remaining siblings are revoked.
  // This is a no-op in Phase 3 (single-guardian) but is safe to run always.
  await prisma.aihApprovalRequest.updateMany({
    where: {
      requestorId: approvalRequest.requestorId,
      actionKind:  approvalRequest.actionKind,
      state:       "pending",
      id:          { not: requestId },
    },
    data: { state: "revoked", resolvedAt },
  });

  const auditKind =
    action === "approve"
      ? AuditEventKind.GUARDIAN_CONSENT_GIVEN
      : AuditEventKind.GUARDIAN_CONSENT_DENIED;

  await emitAuditEvent({
    kind:     auditKind,
    actorId:  actor.actorUserId as string,
    targetId: approvalRequest.requestorId,
    meta:     { requestId, action, note: note ?? null, actionKind: approvalRequest.actionKind },
  });

  // Re-fetch the resolved record for the response DTO.
  const updated = await prisma.aihApprovalRequest.findUnique({ where: { id: requestId } });
  if (!updated) return serverError("Failed to fetch resolved approval request");

  const requestorUser = await prisma.user.findUnique({
    where:  { id: approvalRequest.requestorId },
    select: { firstName: true, lastName: true },
  });
  const requestorName = requestorUser
    ? `${requestorUser.firstName ?? ""} ${requestorUser.lastName ?? ""}`.trim()
    : approvalRequest.requestorId;

  // NOTE — deferred re-execution gap (Phase 4):
  // When action = "approve", the original deferred action (stored in contextJson) is NOT
  // re-executed here. The guardian receives a resolved ApprovalRequestDTO but the
  // underlying resource (TrustUnitMember, FamilyUnit, etc.) is not yet created.
  // See docs/aihsafe/pre-ux-blockers.md §Deferred Action Re-execution.

  return ok(toApprovalDTO(updated, requestorName));
}
