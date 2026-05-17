// AIH Safe Governance — deterministic contract only. No persistence, no UI.
//
// Context shapes and decision types for the governance kernel.
// These are pure data contracts — no DB calls, no async, no side effects.

import type { AIHUserId, TrustUnitId, FamilyUnitId } from "./ids";
import type { AgeTier } from "./age-tiers";
import type { SystemRole, FamilySafeRole, TrustUnitRole } from "./roles";
import type { VisibilityScope } from "./visibility";
import type { ApprovalState } from "./approval-states";
import type { TrustUnitMembership, RelationshipEdge } from "./trust-units";
import type { GuardianRelationship } from "./guardian";
import type { AuditEventKind } from "./audit-events";

// ─── Actor Context ─────────────────────────────────────────────────────────────
// Represents the user initiating an action.
// Populated by the caller (API route) before invoking any governance function.
// Never constructed inside the governance service — always injected.

export interface ActorContext {
  actorUserId:            AIHUserId;
  ageTier:                AgeTier;
  systemRole:             SystemRole;
  familySafeRole:         FamilySafeRole;
  memberships:            TrustUnitMembership[];       // active TrustUnit memberships
  guardianRelationships:  GuardianRelationship[];      // relationships where actor IS the guardian
  guardedByRelationships: GuardianRelationship[];      // relationships where actor IS the child
  relationshipEdges:      RelationshipEdge[];          // all directed edges from/to actor
}

// ─── Target Context ────────────────────────────────────────────────────────────
// Represents the target user, content, or unit of an action.
// All fields optional — populate only what is relevant to the specific action.
// Caller is responsible for pre-computing shared unit IDs and actor's role in the target unit.

export interface TargetContext {
  targetUserId?:          AIHUserId;
  targetAgeTier?:         AgeTier;
  /** When false, invite/join targets an existing account excluded from Trust Units (e.g. system admin). */
  targetTrustUnitEligible?: boolean;
  trustUnitId?:           TrustUnitId;       // target trust unit for unit-scoped actions
  familyUnitId?:          FamilyUnitId;      // target family unit for family-scoped actions
  contentOwnerId?:        AIHUserId;         // owner of the content being acted on
  visibilityScope?:       VisibilityScope;   // scope of the content or action
  approvalState?:         ApprovalState;     // current approval state, if relevant
  // Pre-computed by caller using the graph service:
  sharedTrustUnitIds?:    TrustUnitId[];     // TrustUnit IDs shared by actor and target
  sharedFamilyUnitIds?:   FamilyUnitId[];    // FamilyUnit IDs shared by actor and target
  actorTrustUnitRole?:    TrustUnitRole;     // actor's role in target.trustUnitId (if member)
}

// ─── Governance Decision ───────────────────────────────────────────────────────
// Returned by every governance function.
// If allowed=false and requiredApproval=true, the action is not denied outright —
// it must be routed through a guardian or admin approval flow.

export interface GovernanceDecision {
  allowed:           boolean;
  reasonCode:        ReasonCode;
  reason:            string;
  requiredApproval?: boolean;    // true = escalate to approval flow rather than hard deny
  auditEventType?:   AuditEventKind; // event kind to emit when this decision is acted upon
}

// ─── Reason Codes ─────────────────────────────────────────────────────────────
// Stable string constants for machine-readable governance outcomes.
// Do not use raw strings — always reference these constants.

export const ReasonCode = {
  ALLOWED:                      "ALLOWED",
  DENIED_NOT_AUTHENTICATED:     "DENIED_NOT_AUTHENTICATED",
  DENIED_MINOR_REQUIRES_GUARDIAN:"DENIED_MINOR_REQUIRES_GUARDIAN",
  DENIED_NOT_GUARDIAN:          "DENIED_NOT_GUARDIAN",
  DENIED_NOT_MEMBER:            "DENIED_NOT_MEMBER",
  DENIED_NOT_TRUST_UNIT_ELIGIBLE: "DENIED_NOT_TRUST_UNIT_ELIGIBLE",
  DENIED_INSUFFICIENT_ROLE:     "DENIED_INSUFFICIENT_ROLE",
  DENIED_SCOPE_NOT_ALLOWED:     "DENIED_SCOPE_NOT_ALLOWED",
  DENIED_APPROVAL_REQUIRED:     "DENIED_APPROVAL_REQUIRED",
  DENIED_TARGET_NOT_FOUND:      "DENIED_TARGET_NOT_FOUND",
  DENIED_UNSUPPORTED_ACTION:    "DENIED_UNSUPPORTED_ACTION",
  REQUIRES_GUARDIAN_APPROVAL:   "REQUIRES_GUARDIAN_APPROVAL",
  REQUIRES_UNIT_ADMIN_APPROVAL: "REQUIRES_UNIT_ADMIN_APPROVAL",
} as const;
export type ReasonCode = (typeof ReasonCode)[keyof typeof ReasonCode];

// ─── Input Shapes ──────────────────────────────────────────────────────────────
// Supplementary input for governance functions that need more than actor + target.

export interface CreateTrustUnitInput {
  kind: import("./trust-units").TrustUnitKind;
  /**
   * When true, Trust Unit actor-eligibility rules are skipped (AIH Family workspace API only).
   * Must not be used for `/api/aihsafe/trust-units` or legacy wedge formation.
   */
  skipTrustUnitActorEligibility?: boolean;
}
