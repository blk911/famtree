// AIH Safe Core Graph — foundational contract only. No persistence, no UI, no permissions.
//
// Age tier classification derived from User.dateOfBirth at runtime.
// Never persisted — re-derived on each request so tiers advance as users age.
// Derivation logic lives in the governance service (Phase 2).

export const AgeTier = {
  CHILD:   "child",    // under 13
  PRETEEN: "preteen",  // 13–15
  TEEN:    "teen",     // 16–17
  ADULT:   "adult",    // 18–64
  ELDER:   "elder",    // 65+
  // @deprecated — kept for backward compat; prefer ADULT when dateOfBirth is absent.
  UNKNOWN: "unknown",
} as const;
export type AgeTier = (typeof AgeTier)[keyof typeof AgeTier];

// Age boundary constants (years). Governance policy owns these — adjust there, not here.
export const AGE_TIER_BOUNDARIES = {
  CHILD_MAX:   12,
  PRETEEN_MAX: 15,
  TEEN_MAX:    17,
  ADULT_MAX:   64,
} as const;

// Minor tiers — AgeTiers that require guardian oversight.
export const MINOR_TIERS: readonly AgeTier[] = [
  AgeTier.CHILD,
  AgeTier.PRETEEN,
  AgeTier.TEEN,
] as const;

export const isMinorTier = (tier: AgeTier): boolean =>
  (MINOR_TIERS as readonly string[]).includes(tier);
