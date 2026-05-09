// AIH Safe Core Graph — foundational contract only. No persistence, no UI, no permissions.
//
// Branded ID types for the AIH Safe domain.
// Use only at system boundaries (auth layer, API input parsing).
// Never cast inside business logic.

// ─── Core IDs ───────────────────────────────────────────────────────────────

export type UserId = string & { readonly __brand: "UserId" };

// AIHUserId — preferred alias in AIH Safe service code.
// Structurally identical to UserId; use AIHUserId in new code.
export type AIHUserId = UserId;

export type FamilyUnitId = string & { readonly __brand: "FamilyUnitId" };
export type TrustUnitId  = string & { readonly __brand: "TrustUnitId" };
export type InviteId     = string & { readonly __brand: "InviteId" };
export type MembershipId = string & { readonly __brand: "MembershipId" };
export type AuditEventId = string & { readonly __brand: "AuditEventId" };
export type ContentId    = string & { readonly __brand: "ContentId" };

// GuardianId — branded ID of the guardian user (same underlying type as UserId).
// ChildId — branded ID of the child user (same underlying type as UserId).
export type GuardianId = string & { readonly __brand: "GuardianId" };
export type ChildId    = string & { readonly __brand: "ChildId" };

// GuardianRelationshipId — ID of the relationship record itself (not the guardian user).
export type GuardianRelationshipId = string & { readonly __brand: "GuardianRelationshipId" };

// ─── Cast Helpers ────────────────────────────────────────────────────────────
// Use only at system boundaries. Never use inside business logic.

export const asUserId               = (id: string): UserId               => id as UserId;
export const asAIHUserId            = (id: string): AIHUserId            => id as AIHUserId;
export const asFamilyUnitId         = (id: string): FamilyUnitId         => id as FamilyUnitId;
export const asTrustUnitId          = (id: string): TrustUnitId          => id as TrustUnitId;
export const asInviteId             = (id: string): InviteId             => id as InviteId;
export const asMembershipId         = (id: string): MembershipId         => id as MembershipId;
export const asAuditEventId         = (id: string): AuditEventId         => id as AuditEventId;
export const asContentId            = (id: string): ContentId            => id as ContentId;
export const asGuardianId           = (id: string): GuardianId           => id as GuardianId;
export const asChildId              = (id: string): ChildId              => id as ChildId;
export const asGuardianRelationshipId = (id: string): GuardianRelationshipId => id as GuardianRelationshipId;
