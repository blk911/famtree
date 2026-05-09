// AIH Safe Base Scaffold — foundational contract only. Do not add feature logic here.

import type { MembershipId, UserId, FamilyUnitId, TrustUnitId } from "./ids";

export const MembershipState = {
  ACTIVE:    "active",
  SUSPENDED: "suspended",
  REMOVED:   "removed",
  PENDING:   "pending",  // awaiting guardian approval for child memberships
} as const;
export type MembershipState = (typeof MembershipState)[keyof typeof MembershipState];

export const MembershipKind = {
  FAMILY_UNIT: "family_unit",
  TRUST_UNIT:  "trust_unit",
} as const;
export type MembershipKind = (typeof MembershipKind)[keyof typeof MembershipKind];

export interface Membership {
  id:       MembershipId;
  userId:   UserId;
  unitId:   FamilyUnitId | TrustUnitId;
  unitKind: MembershipKind;
  state:    MembershipState;
  joinedAt: string;       // ISO 8601
  exitedAt: string | null;
}
