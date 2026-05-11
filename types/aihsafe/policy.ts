// AIH Safe — Policy profile type contracts.
//
// Defines the configurable governance policy layer that sits between the
// deterministic governance kernel (lib/aihsafe/governance/) and individual users.
//
// Design rules:
//   - All types are pure data contracts. No DB calls, no async, no side effects.
//   - Sub-policies are stored as JSON blobs in AihPolicyProfile.
//   - The governance kernel is NOT changed — this layer is additive.
//   - UNKNOWN age tier receives conservative defaults (not adult-permissive).

import type { AgeTier } from "./age-tiers";
import type { VisibilityScope } from "./visibility";

// ─── PolicySourceType ─────────────────────────────────────────────────────────
// Provenance marker: how was this policy profile derived?
// Stored in AihPolicyProfile.sourceType as a plain string.

export const PolicySourceType = {
  SYSTEM_DEFAULT:    "system_default",    // no founder settings; hardcoded safe defaults
  FOUNDER_DEFAULT:   "founder_default",   // derived from AihFounderSettings for this tier
  GUARDIAN_OVERRIDE: "guardian_override", // guardian manually adjusted for their child
  FOUNDER_OVERRIDE:  "founder_override",  // founder manually set for a specific user
} as const;
export type PolicySourceType = (typeof PolicySourceType)[keyof typeof PolicySourceType];

// ─── PostingPolicy ────────────────────────────────────────────────────────────

export interface PostingPolicy {
  /** Whether this user may create posts at all. */
  allowed: boolean;
  /** If true the post must be routed through a guardian approval before publishing. */
  requiresGuardianApproval: boolean;
  /** Max posts per calendar day. 0 = no platform limit enforced. */
  dailyLimit: number;
  /** Max post body length in characters. */
  maxBodyLength: number;
  /** Visibility scopes the user may assign to their posts. */
  allowedScopes: VisibilityScope[];
}

// ─── InvitePolicy ─────────────────────────────────────────────────────────────

export interface InvitePolicy {
  /** Whether this user may send invites at all. */
  allowed: boolean;
  /** If true invites must be approved by a guardian before the email is sent. */
  requiresGuardianApproval: boolean;
  /** Max invites per calendar day. 0 = no platform limit enforced. */
  dailyLimit: number;
}

// ─── VisibilityPolicy ─────────────────────────────────────────────────────────

export interface VisibilityPolicy {
  /** The scope applied by default when the user creates content. */
  defaultScope: VisibilityScope;
  /** Scopes the user may choose from. Subset of VisibilityScope values. */
  allowedScopes: VisibilityScope[];
  /** Most permissive scope the user may ever set. */
  maxScope: VisibilityScope;
  /**
   * Whether this user's profile appears in tree/search results to
   * non-guardian members. false = guardian-and-family-unit-only visibility.
   */
  profileDiscoverable: boolean;
}

// ─── InterestsPolicy ─────────────────────────────────────────────────────────
// Placeholder shape for Agent 40 (Child Interests UI).
// Included here so AihPolicyProfile.interestsPolicy is typed at the service layer.

export interface InterestsPolicy {
  /**
   * If false, child may only select from founder-approved categories.
   * If true, child may use any active category.
   */
  allowCustomCategories: boolean;
  /** If true, adding a new interest requires a guardian approval request. */
  requireGuardianApprovalForNewInterests: boolean;
  /**
   * IDs of AihInterestCategory rows the user is allowed to select.
   * Empty array = all active categories are permitted.
   * Populated by Agent 40.
   */
  allowedCategoryIds: string[];
}

// ─── LimitsPolicy ─────────────────────────────────────────────────────────────
// Ceiling definitions enforced by lib/aihsafe/limits (Agent 41).
// 0 = no limit enforced for that counter.

export interface LimitsPolicy {
  /** Max posts per calendar day. 0 = no limit. */
  dailyPostLimit: number;
  /** Max invites per calendar day. 0 = no limit. */
  dailyInviteLimit: number;
  /** Max posts per rolling 7-day window. 0 = no limit. */
  weeklyPostLimit: number;
  /** Max comments per calendar day. 0 = no limit. */
  dailyCommentLimit: number;
}

// ─── EscalationPolicy ────────────────────────────────────────────────────────

export interface EscalationPolicy {
  requiresGuardianApprovalForSpaceJoin: boolean;
  requiresGuardianApprovalForTrustExpansion: boolean;
  /**
   * If true, any post the user creates must be held in a "pending" state
   * until a guardian approves it. Used for CHILD tier by default.
   */
  requiresGuardianApprovalForPostContent: boolean;
  /** Approval requests expire after this many hours. */
  autoExpireApprovalAfterHours: number;
}

// ─── ResolvedPolicyProfile ────────────────────────────────────────────────────
// The fully-merged, in-memory policy for a specific user.
// Constructed by resolvePolicyProfile(); never stored in this exact shape.
// This is what API routes and future kernel overrides should consume.

export interface ResolvedPolicyProfile {
  userId: string;
  /** The age tier used when this profile was last resolved. */
  ageTierSnapshot: AgeTier;
  /** How this profile was derived — for audit and UI provenance display. */
  sourceType: PolicySourceType;
  posting: PostingPolicy;
  invite: InvitePolicy;
  visibility: VisibilityPolicy;
  interests: InterestsPolicy;
  limits: LimitsPolicy;
  escalation: EscalationPolicy;
}

// ─── FounderSettingsData ─────────────────────────────────────────────────────
// Matches AihFounderSettings DB model field-for-field.
// Used by resolvePolicyProfile() to apply network-level overrides.
// Read-only from the policy layer's perspective.

export interface FounderSettingsData {
  requireGuardianApprovalForMinors: boolean;
  allowMinorInvites: boolean;
  allowMinorPosting: boolean;
  allowMinorExternalLinks: boolean;
  /** Default visibility scope applied to non-minor members. VisibilityScope value. */
  defaultVisibilityScope: VisibilityScope;
  enableTrustedAdults: boolean;
  enablePrivateThreads: boolean;
}

// ─── ChildPolicyProjection ────────────────────────────────────────────────────
// A stripped-down view of ResolvedPolicyProfile safe to expose to child UI.
// Parent-only restrictions are omitted. Only child-visible affordances included.
// Constructed by projectChildPolicy().

export interface ChildPolicyProjection {
  canPost: boolean;
  canComment: boolean;
  canInvite: boolean;
  defaultScope: VisibilityScope;
  allowedScopes: VisibilityScope[];
  /** 0 = no limit; shown as "unlimited" in UI. */
  postDailyLimit: number;
  /** Empty = all founder-approved categories; populated by Agent 40. */
  allowedCategoryIds: string[];
  /**
   * Number of actions currently awaiting guardian approval.
   * Injected by the caller after loading AihApprovalRequest rows.
   * Not stored in the policy profile.
   */
  pendingApprovalCount: number;
}
