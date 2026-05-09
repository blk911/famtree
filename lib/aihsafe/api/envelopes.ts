// AIH Safe — Response envelope helpers for API route handlers.
// Build typed NextResponse.json() shapes that match the AIHSafeResponse contract.

import { NextResponse } from "next/server";
import type { GovernanceDecision } from "@/types/aihsafe/governance";
import type {
  SuccessResponse,
  AcceptedResponse,
  ErrorResponse,
  ResponseMeta,
} from "@/types/aihsafe/api-responses";
import type {
  PendingEscalationDTO,
  GovernanceDecisionDTO,
} from "@/types/aihsafe/dto";

// Re-export so routes only import from this module
export type { GovernanceDecisionDTO, PendingEscalationDTO };

// ─── Request ID ───────────────────────────────────────────────────────────────

export function genRequestId(): string {
  return crypto.randomUUID();
}

function meta(): ResponseMeta {
  return { requestId: genRequestId() };
}

// ─── Governance DTO helpers ───────────────────────────────────────────────────

export function toGovernanceDTO(
  decision: GovernanceDecision,
  approvalRequestId?: string
): GovernanceDecisionDTO {
  return {
    allowed:          decision.allowed,
    reasonCode:       decision.reasonCode,
    reason:           decision.reason,
    requiredApproval: decision.requiredApproval ?? false,
    ...(approvalRequestId ? { approvalRequestId } : {}),
  };
}

export function approvalExpiresAt(): Date {
  return new Date(Date.now() + 48 * 60 * 60 * 1000);
}

// ─── Success envelopes ────────────────────────────────────────────────────────

export function ok<T>(data: T): NextResponse<SuccessResponse<T>> {
  return NextResponse.json({ ok: true, data, meta: meta() }, { status: 200 });
}

export function created<T>(data: T): NextResponse<SuccessResponse<T>> {
  return NextResponse.json({ ok: true, data, meta: meta() }, { status: 201 });
}

export function accepted(
  pending: PendingEscalationDTO,
  decision: GovernanceDecision,
  approvalRequestId: string
): NextResponse<AcceptedResponse> {
  return NextResponse.json(
    {
      ok:         true,
      data:       null,
      pending,
      governance: toGovernanceDTO(decision, approvalRequestId),
      meta:       meta(),
    },
    { status: 202 }
  );
}

// ─── Error envelopes ──────────────────────────────────────────────────────────

export function unauthenticated(): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      ok:    false,
      error: { message: "Not authenticated", code: "NOT_AUTHENTICATED", status: 401 },
      meta:  meta(),
    },
    { status: 401 }
  );
}

export function governanceDenied(
  decision: GovernanceDecision
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      ok:         false,
      error:      { message: decision.reason, code: decision.reasonCode, status: 403 },
      governance: toGovernanceDTO(decision),
      meta:       meta(),
    },
    { status: 403 }
  );
}

export function validationFail(
  message: string,
  fields?: Array<{ path: string; message: string }>
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      ok:    false,
      error: { message, code: "VALIDATION_ERROR", status: 422, ...(fields ? { fields } : {}) },
      meta:  meta(),
    },
    { status: 422 }
  );
}

export function notFound(message = "Resource not found"): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { ok: false, error: { message, code: "NOT_FOUND", status: 404 }, meta: meta() },
    { status: 404 }
  );
}

export function conflict(message: string): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { ok: false, error: { message, code: "CONFLICT", status: 409 }, meta: meta() },
    { status: 409 }
  );
}

export function unprocessable(message: string): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { ok: false, error: { message, code: "VALIDATION_ERROR", status: 422 }, meta: meta() },
    { status: 422 }
  );
}

export function serverError(message = "Internal server error"): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { ok: false, error: { message, code: "INTERNAL_ERROR", status: 500 }, meta: meta() },
    { status: 500 }
  );
}
