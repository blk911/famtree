// AIH Safe API Contract Architect — contracts only. No live routes or persistence.
//
// Standard API response envelope types for all AIH Safe routes.
// These are pure TypeScript contracts — no runtime logic, no imports from app/*.
// Route handlers construct these shapes using NextResponse.json().

import type {
  FamilyUnitDTO,
  TrustUnitDTO,
  GuardianLinkDTO,
  InviteDTO,
  ApprovalRequestDTO,
  AuditEventDTO,
  GovernanceDecisionDTO,
  PendingEscalationDTO,
} from "./dto";

// ─── Response Meta ────────────────────────────────────────────────────────────

export interface ResponseMeta {
  requestId: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  cursor:  string | null; // pass as ?cursor= on next request; null when no more pages
  hasMore: boolean;
  total:   number | null; // null unless explicitly counted (expensive)
}

export interface PaginatedData<T> {
  items:      T[];
  pagination: PaginationMeta;
}

// ─── Base Envelope Shapes ─────────────────────────────────────────────────────

// 2xx success — resource or collection
export interface SuccessResponse<T> {
  ok:   true;
  data: T;
  meta: ResponseMeta;
}

// 202 Accepted — governance escalation required, action deferred
export interface AcceptedResponse {
  ok:         true;
  data:       null;
  pending:    PendingEscalationDTO;
  governance: GovernanceDecisionDTO;
  meta:       ResponseMeta;
}

// Validation error field
export interface FieldError {
  path:    string;
  message: string;
}

// Error detail — all 4xx/5xx responses
export interface ErrorDetail {
  message: string;
  code:    string;           // ReasonCode for governance errors; standard code otherwise
  status:  number;
  fields?: FieldError[];     // present only for VALIDATION_ERROR
}

// 4xx/5xx error response
export interface ErrorResponse {
  ok:         false;
  error:      ErrorDetail;
  governance?: GovernanceDecisionDTO;  // present when error was a governance denial
  meta:        ResponseMeta;
}

// Union of all possible envelope shapes — returned by any AIH Safe route
export type AIHSafeResponse<T> = SuccessResponse<T> | AcceptedResponse | ErrorResponse;

// ─── Concrete Response Types ─────────────────────────────────────────────────
// One type per route group. Keeps route handler return types explicit.

// Family
export type FamilyUnitResponse         = SuccessResponse<FamilyUnitDTO>;
export type FamilyUnitListResponse     = SuccessResponse<PaginatedData<FamilyUnitDTO>>;

// Trust Units
export type TrustUnitResponse          = SuccessResponse<TrustUnitDTO>;
export type TrustUnitListResponse      = SuccessResponse<PaginatedData<TrustUnitDTO>>;

// Guardian Links
export type GuardianLinkResponse       = SuccessResponse<GuardianLinkDTO>;
export type GuardianLinkListResponse   = SuccessResponse<PaginatedData<GuardianLinkDTO>>;

// Invites
export type InviteResponse             = SuccessResponse<InviteDTO> | AcceptedResponse;
export type InviteListResponse         = SuccessResponse<PaginatedData<InviteDTO>>;

// Approvals
export type ApprovalRequestResponse    = SuccessResponse<ApprovalRequestDTO>;
export type ApprovalListResponse       = SuccessResponse<PaginatedData<ApprovalRequestDTO>>;
export type ApprovalResolveResponse    = SuccessResponse<ApprovalRequestDTO>;

// Memberships
export type MembershipResponse         = SuccessResponse<{ membershipId: string }> | AcceptedResponse;

// Visibility
export type VisibilityCheckResponse    = SuccessResponse<GovernanceDecisionDTO>;
export type MaxScopeResponse           = SuccessResponse<{ maxScope: string }>;

// Audit
export type AuditEventListResponse     = SuccessResponse<PaginatedData<AuditEventDTO>>;

// ─── Standard Error Codes ────────────────────────────────────────────────────
// Stable string constants for all non-governance error.code values.
// Governance errors reuse ReasonCode from types/aihsafe/governance.ts.

export const ApiErrorCode = {
  VALIDATION_ERROR:    "VALIDATION_ERROR",
  NOT_AUTHENTICATED:   "NOT_AUTHENTICATED",
  NOT_FOUND:           "NOT_FOUND",
  CONFLICT:            "CONFLICT",
  ALREADY_RESOLVED:    "ALREADY_RESOLVED",
  ESCALATION_PENDING:  "ESCALATION_PENDING",
  RATE_LIMITED:        "RATE_LIMITED",
  INTERNAL_ERROR:      "INTERNAL_ERROR",
} as const;
export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];
