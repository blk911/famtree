// AIH Safe Core Graph — foundational contract only. No persistence, no UI, no permissions.
//
// Visibility scopes for content, profiles, and actions.
// Resolved at query time by lib/aihsafe/visibility/ — never stored as a raw string in the DB
// without the governance service having validated the assignment.

export const VisibilityScope = {
  PRIVATE:        "private",         // owner only
  GUARDIAN_ONLY:  "guardian_only",   // owner + registered guardians of the owner
  FAMILY:         "family",          // all members of the owning FamilyUnit
  TRUST_UNIT:     "trust_unit",      // all users in any shared TrustUnit
  EXTENDED_TRUST: "extended_trust",  // all registered tree members (existing tree behavior)
  PUBLIC_APPROVED:"public_approved", // explicit platform approval required; never for CHILD content
} as const;
export type VisibilityScope = (typeof VisibilityScope)[keyof typeof VisibilityScope];

// Scopes that are valid for content owned by CHILD or PRETEEN age tier users.
// PUBLIC_APPROVED is intentionally absent — minors cannot self-publish.
export const MINOR_ALLOWED_SCOPES: readonly VisibilityScope[] = [
  VisibilityScope.PRIVATE,
  VisibilityScope.GUARDIAN_ONLY,
  VisibilityScope.FAMILY,
] as const;

// Scopes that are valid for TEEN age tier users (wider than CHILD, still no public).
export const TEEN_ALLOWED_SCOPES: readonly VisibilityScope[] = [
  VisibilityScope.PRIVATE,
  VisibilityScope.GUARDIAN_ONLY,
  VisibilityScope.FAMILY,
  VisibilityScope.TRUST_UNIT,
] as const;

export const isMinorAllowedScope = (scope: VisibilityScope): boolean =>
  (MINOR_ALLOWED_SCOPES as readonly string[]).includes(scope);
