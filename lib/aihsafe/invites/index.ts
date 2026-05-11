// AIH Safe — Invite Service
//
// Wraps the existing lib/invite/index.ts with guardian-consent lifecycle rules.
// Routes adult-inviting-minor flows through the guardian approval gate.
//
// Design rules:
//   - Never bypass the identity challenge (lib/invite enforces it).
//   - Never create user accounts directly.
//   - Never auto-send an invite to a minor without guardian approval.
//   - Service functions throw InviteServiceError; routes convert to envelopes.
//   - Limits are enforced here via the Agent 41 limits engine.
//
// Lifecycle mapping:
//   sendChildInvite()       → creates AihApprovalRequest; returns state=DRAFT
//   guardianApproveInvite() → transitions approval to "approved"; executes deferred invite creation
//   guardianDeclineInvite() → transitions approval to "denied"
//   getInviteState()        → dual lookup: Invite table OR AihApprovalRequest table

import { prisma }               from "@/lib/db/prisma";
import { emitAuditEvent }       from "@/lib/aihsafe/audit";
import { executeDeferredAction } from "@/lib/aihsafe/approvals";
import { checkInviteLimits }    from "@/lib/aihsafe/limits";
import { AuditEventKind }       from "@/types/aihsafe/audit-events";
import { AIHInviteState }       from "@/types/aihsafe/invite-states";
import type { UserId, InviteId } from "@/types/aihsafe/ids";

// ─── Error types ──────────────────────────────────────────────────────────────

export class InviteServiceError extends Error {
  constructor(message: string, public readonly code: string = "INVITE_ERROR") {
    super(message);
    this.name = "InviteServiceError";
  }
}

export class InviteLimitError extends InviteServiceError {
  constructor(message: string) {
    super(message, "INVITE_LIMIT_REACHED");
    this.name = "InviteLimitError";
  }
}

// ─── Internal state mappers ───────────────────────────────────────────────────

function mapPrismaStatusToState(status: string): AIHInviteState {
  switch (status) {
    case "PENDING":    return AIHInviteState.SENT;      // email delivered, awaiting challenge
    case "ACCEPTED":   return AIHInviteState.ACCEPTED;  // challenge passed
    case "REGISTERED": return AIHInviteState.ACCEPTED;  // account created — terminal
    case "EXPIRED":    return AIHInviteState.EXPIRED;
    case "CANCELLED":  return AIHInviteState.REVOKED;
    default:           return AIHInviteState.EXPIRED;
  }
}

function mapApprovalStateToInviteState(state: string): AIHInviteState {
  switch (state) {
    case "pending":  return AIHInviteState.DRAFT;    // awaiting guardian decision
    case "approved": return AIHInviteState.SENT;     // guardian approved; invite email sent
    case "denied":   return AIHInviteState.DECLINED; // guardian declined
    case "revoked":  return AIHInviteState.REVOKED;  // sibling approval resolved it
    case "expired":  return AIHInviteState.EXPIRED;
    default:         return AIHInviteState.EXPIRED;
  }
}

// ─── APPROVAL_EXPIRY ──────────────────────────────────────────────────────────

const APPROVAL_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours (matches EscalationPolicy default)

// ─── sendChildInvite ──────────────────────────────────────────────────────────

/**
 * Adult (senderId) wants to invite a minor to their network.
 * The minor's guardian (guardianId) must approve before the invite email is sent.
 *
 * Creates an AihApprovalRequest for the guardian.
 * Returns immediately with state=DRAFT — no invite record exists until the guardian approves.
 * The returned inviteId is the AihApprovalRequest.id; use it with getInviteState,
 * guardianApproveInvite, and guardianDeclineInvite.
 *
 * Limits:
 *   - Enforces Agent 41 daily invite ceiling for the sender.
 *   - UNKNOWN-tier senders are treated conservatively (dailyInviteLimit=0).
 *
 * Called by: routes that allow adults to invite minor recipients when a
 * guardian consent gate is required. The existing POST /api/aihsafe/invites
 * route implements this inline; this function is the canonical service-layer
 * version for programmatic use.
 */
export async function sendChildInvite(
  senderId:       UserId,
  guardianId:     UserId,
  recipientEmail: string,
  relationship:   string
): Promise<{ inviteId: InviteId; state: AIHInviteState }> {
  // ── Limits check ────────────────────────────────────────────────────────────
  const limitCheck = await checkInviteLimits(senderId as string);
  if (!limitCheck.allowed) {
    throw new InviteLimitError(limitCheck.message);
  }

  // ── Validate sender ──────────────────────────────────────────────────────────
  const sender = await prisma.user.findUnique({
    where:  { id: senderId as string },
    select: { id: true, status: true },
  });
  if (!sender || sender.status !== "active") {
    throw new InviteServiceError("Sender not found or not active", "SENDER_INACTIVE");
  }

  // ── Validate guardian ────────────────────────────────────────────────────────
  const guardian = await prisma.user.findUnique({
    where:  { id: guardianId as string },
    select: { id: true, status: true },
  });
  if (!guardian || guardian.status !== "active") {
    throw new InviteServiceError("Guardian not found or not active", "GUARDIAN_INACTIVE");
  }

  // ── Idempotency: skip if a pending approval already exists for this pair ─────
  const existing = await prisma.aihApprovalRequest.findFirst({
    where: {
      requestorId: senderId as string,
      approverId:  guardianId as string,
      actionKind:  AuditEventKind.INVITE_SENT_CHILD,
      state:       "pending",
      contextJson: { path: ["recipientEmail"], equals: recipientEmail.trim().toLowerCase() },
    },
    select: { id: true },
  });
  if (existing) {
    return { inviteId: existing.id as InviteId, state: AIHInviteState.DRAFT };
  }

  // ── Create approval request ──────────────────────────────────────────────────
  const normalizedEmail = recipientEmail.trim().toLowerCase();
  const expiresAt       = new Date(Date.now() + APPROVAL_TTL_MS);

  const approvalRequest = await prisma.aihApprovalRequest.create({
    data: {
      requestorId: senderId as string,
      approverId:  guardianId as string,
      actionKind:  AuditEventKind.INVITE_SENT_CHILD,
      contextJson: {
        action:         "invite_member",
        recipientEmail: normalizedEmail,
        relationship,
        familyUnitId:   null,
        trustUnitId:    null,
        targetAgeTier:  null,
      },
      expiresAt,
    },
  });

  await emitAuditEvent({
    kind:     AuditEventKind.INVITE_SENT_CHILD,
    actorId:  senderId as string,
    targetId: guardianId as string,
    meta: {
      recipientEmail:    normalizedEmail,
      relationship,
      approvalRequestId: approvalRequest.id,
      escalated:         true,
    },
  });

  return { inviteId: approvalRequest.id as InviteId, state: AIHInviteState.DRAFT };
}

// ─── getInviteState ───────────────────────────────────────────────────────────

/**
 * Resolve the current AIHInviteState for an invite ID.
 *
 * Performs a dual lookup:
 *   1. Invite table (standard invite lifecycle)
 *   2. AihApprovalRequest table (invite pending guardian approval)
 *
 * The inviteId may be either an Invite.id or an AihApprovalRequest.id.
 * Throws InviteServiceError if the ID is not found in either table.
 */
export async function getInviteState(inviteId: InviteId): Promise<AIHInviteState> {
  // Probe the Invite table first — this is the post-approval state.
  const invite = await prisma.invite.findUnique({
    where:  { id: inviteId as string },
    select: { status: true },
  });
  if (invite) {
    return mapPrismaStatusToState(invite.status);
  }

  // Probe AihApprovalRequest for pre-approval (DRAFT) invites.
  const approval = await prisma.aihApprovalRequest.findUnique({
    where:  { id: inviteId as string },
    select: { state: true, actionKind: true },
  });
  if (approval && approval.actionKind === AuditEventKind.INVITE_SENT_CHILD) {
    return mapApprovalStateToInviteState(approval.state);
  }

  throw new InviteServiceError(
    `Invite not found: ${inviteId as string}`,
    "INVITE_NOT_FOUND"
  );
}

// ─── guardianApproveInvite ────────────────────────────────────────────────────

/**
 * Guardian approves a pending child invite approval request.
 *
 * - Validates guardianId is the assigned approver.
 * - Validates the request is still pending and not expired.
 * - Performs an atomic state transition to "approved".
 * - Revokes sibling requests (multi-guardian fan-out).
 * - Executes the deferred "invite_member" action (creates the Invite record).
 * - Emits GUARDIAN_CONSENT_GIVEN audit event.
 *
 * The inviteId must be an AihApprovalRequest.id returned by sendChildInvite.
 * Throws InviteServiceError on any validation failure.
 */
export async function guardianApproveInvite(
  guardianId: UserId,
  inviteId:   InviteId
): Promise<void> {
  const req = await prisma.aihApprovalRequest.findUnique({
    where:  { id: inviteId as string },
    select: {
      id:          true,
      requestorId: true,
      approverId:  true,
      actionKind:  true,
      state:       true,
      contextJson: true,
      expiresAt:   true,
    },
  });

  if (!req) {
    throw new InviteServiceError("Invite approval request not found", "INVITE_NOT_FOUND");
  }
  if (req.approverId !== (guardianId as string)) {
    // Return not-found rather than forbidden to prevent approver enumeration.
    throw new InviteServiceError("Invite approval request not found", "INVITE_NOT_FOUND");
  }
  if (req.actionKind !== AuditEventKind.INVITE_SENT_CHILD) {
    throw new InviteServiceError("Approval request is not an invite request", "INVALID_ACTION_KIND");
  }
  if (req.state !== "pending") {
    throw new InviteServiceError(`Invite is already ${req.state}`, "INVITE_ALREADY_RESOLVED");
  }
  if (req.expiresAt < new Date()) {
    throw new InviteServiceError("Invite approval has expired", "INVITE_EXPIRED");
  }

  // Atomic transition — guards against concurrent guardian resolution.
  const result = await prisma.aihApprovalRequest.updateMany({
    where: { id: inviteId as string, state: "pending" },
    data:  { state: "approved", resolvedAt: new Date() },
  });
  if (result.count === 0) {
    throw new InviteServiceError(
      "Invite was already resolved by another guardian",
      "INVITE_ALREADY_RESOLVED"
    );
  }

  // Revoke sibling approval requests for the same invite action.
  await prisma.aihApprovalRequest.updateMany({
    where: {
      requestorId: req.requestorId,
      actionKind:  AuditEventKind.INVITE_SENT_CHILD,
      state:       "pending",
      id:          { not: inviteId as string },
    },
    data: { state: "revoked", resolvedAt: new Date() },
  });

  // Execute the deferred action — creates the Invite record and sends the email.
  // Failure is non-fatal: the approval state is already committed.
  await executeDeferredAction(
    { requestorId: req.requestorId, actionKind: req.actionKind, contextJson: req.contextJson },
    guardianId as string
  ).catch(() => undefined);

  await emitAuditEvent({
    kind:     AuditEventKind.GUARDIAN_CONSENT_GIVEN,
    actorId:  guardianId as string,
    targetId: req.requestorId,
    meta:     { inviteApprovalRequestId: inviteId as string, action: "approve" },
  });
}

// ─── guardianDeclineInvite ────────────────────────────────────────────────────

/**
 * Guardian declines a pending child invite approval request.
 *
 * - Validates guardianId is the assigned approver.
 * - Validates the request is still pending and not expired.
 * - Performs an atomic state transition to "denied".
 * - Emits GUARDIAN_CONSENT_DENIED audit event.
 *
 * No invite record is created. The deferred action is not executed.
 * Throws InviteServiceError on any validation failure.
 */
export async function guardianDeclineInvite(
  guardianId: UserId,
  inviteId:   InviteId
): Promise<void> {
  const req = await prisma.aihApprovalRequest.findUnique({
    where:  { id: inviteId as string },
    select: {
      id:          true,
      requestorId: true,
      approverId:  true,
      actionKind:  true,
      state:       true,
      expiresAt:   true,
    },
  });

  if (!req) {
    throw new InviteServiceError("Invite approval request not found", "INVITE_NOT_FOUND");
  }
  if (req.approverId !== (guardianId as string)) {
    throw new InviteServiceError("Invite approval request not found", "INVITE_NOT_FOUND");
  }
  if (req.actionKind !== AuditEventKind.INVITE_SENT_CHILD) {
    throw new InviteServiceError("Approval request is not an invite request", "INVALID_ACTION_KIND");
  }
  if (req.state !== "pending") {
    throw new InviteServiceError(`Invite is already ${req.state}`, "INVITE_ALREADY_RESOLVED");
  }
  if (req.expiresAt < new Date()) {
    throw new InviteServiceError("Invite approval has expired", "INVITE_EXPIRED");
  }

  // Atomic transition.
  const result = await prisma.aihApprovalRequest.updateMany({
    where: { id: inviteId as string, state: "pending" },
    data:  { state: "denied", resolvedAt: new Date() },
  });
  if (result.count === 0) {
    throw new InviteServiceError(
      "Invite was already resolved by another guardian",
      "INVITE_ALREADY_RESOLVED"
    );
  }

  await emitAuditEvent({
    kind:     AuditEventKind.GUARDIAN_CONSENT_DENIED,
    actorId:  guardianId as string,
    targetId: req.requestorId,
    meta:     { inviteApprovalRequestId: inviteId as string, action: "decline" },
  });
}
