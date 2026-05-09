// AIH Safe — Approval recipient selection helper.
// Extracts guardians eligible to approve on behalf of a minor actor.
// Used by all escalation paths to select approvers consistently.
//
// Phase 3: creates one AihApprovalRequest per eligible guardian (single-guardian path).
// Phase 4: fan-out — each guardian gets their own row; first-write-wins on resolution.
//          The resolver already handles sibling revocation; only creation needs updating.
//
// Multi-guardian fan-out TODO:
//   1. Change callers to create one AihApprovalRequest per guardian in eligibleRecipients.
//   2. No schema change required — the resolver already revokes siblings by
//      (requestorId, actionKind, state=pending, id ≠ resolved).
//   3. Add a Phase 4 background job to expire unresolved siblings at 48h.

import type { GuardianRelationship } from "@/types/aihsafe/guardian";
import { GuardianPermissionLevel } from "@/types/aihsafe/guardian";

/**
 * Return all active guardian relationships that carry approval authority
 * (APPROVER or FULL_CONTROL permission level).
 *
 * The caller passes the minor actor's `guardedByRelationships` from their ActorContext.
 * Returns an empty array when no eligible approvers exist — the caller must then
 * return governanceDenied() rather than silently falling through.
 */
export function selectApprovalRecipients(
  guardedByRelationships: GuardianRelationship[]
): GuardianRelationship[] {
  return guardedByRelationships.filter(
    r =>
      r.revokedAt === null &&
      (r.permissionLevel === GuardianPermissionLevel.APPROVER ||
        r.permissionLevel === GuardianPermissionLevel.FULL_CONTROL)
  );
}
