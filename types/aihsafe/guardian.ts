// AIH Safe Base Scaffold — foundational contract only. Do not add feature logic here.

import type { GuardianId, UserId, ChildId } from "./ids";

export const GuardianRelationshipKind = {
  PARENT:          "parent",
  GRANDPARENT:     "grandparent",
  LEGAL_GUARDIAN:  "legal_guardian",
  TRUSTED_ADULT:   "trusted_adult", // non-family guardian designation
} as const;
export type GuardianRelationshipKind =
  (typeof GuardianRelationshipKind)[keyof typeof GuardianRelationshipKind];

export const GuardianPermissionLevel = {
  VIEW_ONLY:    "view_only",    // can see child activity, no approval authority
  APPROVER:     "approver",     // can approve/decline child actions
  FULL_CONTROL: "full_control", // can modify child profile settings
} as const;
export type GuardianPermissionLevel =
  (typeof GuardianPermissionLevel)[keyof typeof GuardianPermissionLevel];

// Draft contract — Prisma model defined in Phase 1.
export interface GuardianRelationship {
  id:              GuardianId;
  guardianUserId:  UserId;
  childUserId:     ChildId;
  kind:            GuardianRelationshipKind;
  permissionLevel: GuardianPermissionLevel;
  establishedAt:   string;       // ISO 8601
  revokedAt:       string | null;
}

// Minimal shape used by the governance service to answer "is X a guardian of Y?"
export interface GuardianCheckResult {
  isGuardian:      boolean;
  permissionLevel: GuardianPermissionLevel | null;
  relationship:    GuardianRelationship | null;
}
