// AIH Safe Core Graph — foundational contract only. No persistence, no UI, no permissions.
//
// Approval state machine for guardian consent flows, trust unit approvals, and content moderation.
// Extends the existing TrustApprovalStatus (PENDING | APPROVED | DECLINED) with additional states.

export const ApprovalState = {
  NOT_REQUIRED: "not_required", // action does not require approval (adult-initiated, in-scope)
  PENDING:      "pending",      // awaiting decision
  APPROVED:     "approved",     // decision: approved
  DENIED:       "denied",       // decision: denied (formerly DECLINED)
  REVOKED:      "revoked",      // previously approved, but later revoked (formerly WITHDRAWN)
  EXPIRED:      "expired",      // no decision made within the consent window
} as const;
export type ApprovalState = (typeof ApprovalState)[keyof typeof ApprovalState];

// Terminal states — no further state transitions are valid.
export const TERMINAL_APPROVAL_STATES: readonly ApprovalState[] = [
  ApprovalState.APPROVED,
  ApprovalState.DENIED,
  ApprovalState.REVOKED,
  ApprovalState.EXPIRED,
] as const;

// Active (non-terminal, non-resolved) states requiring a guardian action.
export const PENDING_APPROVAL_STATES: readonly ApprovalState[] = [
  ApprovalState.PENDING,
] as const;

export const isTerminalApprovalState = (state: ApprovalState): boolean =>
  (TERMINAL_APPROVAL_STATES as readonly string[]).includes(state);
