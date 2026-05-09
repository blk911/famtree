// AIH Safe Governance — deterministic contract only. No persistence, no UI.
//
// Visibility scope matrix — maps each age tier to its set of allowed scopes.
// Used by the visibility service and governance kernel for deterministic scope checks.
// This is a read-only data structure; no functions, no side effects.

import { AgeTier } from "./age-tiers";
import {
  VisibilityScope,
  MINOR_ALLOWED_SCOPES,
  TEEN_ALLOWED_SCOPES,
} from "./visibility";

// Ordered from most restrictive to most permissive within each tier.
const ALL_SCOPES: readonly VisibilityScope[] = [
  VisibilityScope.PRIVATE,
  VisibilityScope.GUARDIAN_ONLY,
  VisibilityScope.FAMILY,
  VisibilityScope.TRUST_UNIT,
  VisibilityScope.EXTENDED_TRUST,
  VisibilityScope.PUBLIC_APPROVED,
] as const;

// SCOPE_MATRIX — the canonical per-tier allowed scope list.
// Index by AgeTier value to get the allowed scopes for that tier.
export const SCOPE_MATRIX: Readonly<Record<AgeTier, readonly VisibilityScope[]>> = {
  [AgeTier.CHILD]:   MINOR_ALLOWED_SCOPES,
  [AgeTier.PRETEEN]: MINOR_ALLOWED_SCOPES,
  [AgeTier.TEEN]:    TEEN_ALLOWED_SCOPES,
  [AgeTier.ADULT]:   ALL_SCOPES,
  [AgeTier.ELDER]:   ALL_SCOPES,
  // @deprecated tier — treat as ADULT for scope purposes
  [AgeTier.UNKNOWN]: ALL_SCOPES,
} as const;

// Max scope per tier — the most permissive scope the tier is allowed.
export const MAX_SCOPE_FOR_TIER: Readonly<Record<AgeTier, VisibilityScope>> = {
  [AgeTier.CHILD]:   VisibilityScope.FAMILY,
  [AgeTier.PRETEEN]: VisibilityScope.FAMILY,
  [AgeTier.TEEN]:    VisibilityScope.TRUST_UNIT,
  [AgeTier.ADULT]:   VisibilityScope.PUBLIC_APPROVED,
  [AgeTier.ELDER]:   VisibilityScope.PUBLIC_APPROVED,
  [AgeTier.UNKNOWN]: VisibilityScope.PUBLIC_APPROVED,
} as const;
