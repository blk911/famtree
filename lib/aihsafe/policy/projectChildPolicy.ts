// AIH Safe — Child policy projection.
//
// Produces a ChildPolicyProjection from a ResolvedPolicyProfile.
// The projection is a stripped-down, child-safe view that:
//   - omits parent-only fields (escalation rules, guardian approval config)
//   - flattens nested sub-policies into simple boolean/scalar affordances
//   - accepts a pendingApprovalCount injected by the caller (not in DB)
//
// Used by the child UI shell to determine what the child may do and what
// messaging to show. NOT a security boundary — all enforcement is in API routes.

import type { ResolvedPolicyProfile, ChildPolicyProjection } from "@/types/aihsafe/policy";

/**
 * Project a full ResolvedPolicyProfile into a child-safe affordance view.
 *
 * @param profile         The fully resolved policy for this user.
 * @param pendingApprovals Count of AihApprovalRequest rows in "pending" state
 *                        for this user (loaded separately by the caller).
 */
export function projectChildPolicy(
  profile: ResolvedPolicyProfile,
  pendingApprovals: number,
): ChildPolicyProjection {
  return {
    canPost:    profile.posting.allowed,
    canComment: true,   // comment gate is scope+membership only; not policy-configurable yet
    canInvite:  profile.invite.allowed,
    defaultScope:    profile.visibility.defaultScope,
    allowedScopes:   profile.visibility.allowedScopes,
    postDailyLimit:  profile.limits.dailyPostLimit,
    allowedCategoryIds: profile.interests.allowedCategoryIds,
    pendingApprovalCount: pendingApprovals,
  };
}
