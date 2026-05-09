// AIH Safe Core Graph — foundational contract only. No persistence, no UI, no permissions.
//
// Role definitions for the AIH Safe domain.
// SystemRole values match existing User.role DB strings exactly — do not change them.
// TrustUnitRole and GuardianAuthorityRole are AIH Safe-specific; not stored in existing DB.

// ─── System Roles ─────────────────────────────────────────────────────────────
// Maps to existing User.role field values. String values must match the DB.

export const SystemRole = {
  FOUNDER: "founder",
  ADMIN:   "admin",
  MEMBER:  "member",
} as const;
export type SystemRole = (typeof SystemRole)[keyof typeof SystemRole];

// ─── Family Safe Roles ─────────────────────────────────────────────────────────
// Derived classification layered on top of SystemRole.
// NOT stored in DB — derived at runtime by the governance service.

export const FamilySafeRole = {
  GUARDIAN: "guardian",  // adult with parental authority over a ChildProfile
  CHILD:    "child",     // minor account under guardian supervision
  ADULT:    "adult",     // adult member without guardian designation
} as const;
export type FamilySafeRole = (typeof FamilySafeRole)[keyof typeof FamilySafeRole];

// ─── Trust Unit Roles ──────────────────────────────────────────────────────────
// A user's role within a specific TrustUnit.
// NOT stored in DB yet — reserved for Phase 1 schema.

export const TrustUnitRole = {
  CREATOR:   "creator",   // initiated the TrustUnit formation
  MEMBER:    "member",    // standard participating member
  MODERATOR: "moderator", // elevated trust within this unit (future use)
} as const;
export type TrustUnitRole = (typeof TrustUnitRole)[keyof typeof TrustUnitRole];

// ─── Guardian Authority Role ───────────────────────────────────────────────────
// The level of authority a guardian holds over a child.
// Canonical definition lives in guardian.ts as GuardianPermissionLevel.
// Re-exported here under the role-domain name so consumers have one import path.

export type { GuardianPermissionLevel as GuardianAuthorityRole } from "./guardian";
