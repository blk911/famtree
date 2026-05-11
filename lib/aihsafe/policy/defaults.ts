// AIH Safe — Policy defaults factory.
//
// Produces a ResolvedPolicyProfile from an AgeTier and optional
// FounderSettingsData. All outputs are conservative: when in doubt,
// the policy restricts rather than permits.
//
// UNKNOWN age tier treatment:
//   UNKNOWN is returned by deriveAgeTier() when User.dateOfBirth is null.
//   Previously the governance kernel treated UNKNOWN as fully adult-permissive
//   (see: lib/aihsafe/governance/index.ts isScopePermittedFor, which falls
//   through to `return true` for UNKNOWN). This defaults factory treats UNKNOWN
//   as CONSERVATIVE — similar to TEEN — so that unverified-age users do not
//   receive adult posting/invite freedoms at the policy layer.
//
//   The governance kernel is NOT modified (no breaking changes). The policy layer
//   is additive. API routes that use resolvePolicyProfile() will enforce these
//   conservative UNKNOWN defaults on top of the kernel's age-tier gates.
//   See: docs/aihsafe/agent-37-policy-schema-foundation-report.md for
//   remaining unsafe UNKNOWN paths that are not yet covered.

import { AgeTier, isMinorTier } from "@/types/aihsafe/age-tiers";
import {
  VisibilityScope,
  MINOR_ALLOWED_SCOPES,
  TEEN_ALLOWED_SCOPES,
} from "@/types/aihsafe/visibility";
import { PolicySourceType } from "@/types/aihsafe/policy";
import type {
  ResolvedPolicyProfile,
  FounderSettingsData,
  PostingPolicy,
  InvitePolicy,
  VisibilityPolicy,
  InterestsPolicy,
  LimitsPolicy,
  EscalationPolicy,
} from "@/types/aihsafe/policy";

// ─── Internal scope helpers ────────────────────────────────────────────────────

/** All scopes available to adults — used as the permissive ceiling. */
const ADULT_SCOPES: readonly VisibilityScope[] = [
  VisibilityScope.PRIVATE,
  VisibilityScope.GUARDIAN_ONLY,
  VisibilityScope.FAMILY,
  VisibilityScope.TRUST_UNIT,
  VisibilityScope.EXTENDED_TRUST,
  VisibilityScope.PUBLIC_APPROVED,
] as const;

// ─── Sub-policy builders ───────────────────────────────────────────────────────

function postingDefaults(tier: AgeTier, fs: FounderSettingsData | null): PostingPolicy {
  switch (tier) {
    case AgeTier.CHILD:
    case AgeTier.PRETEEN:
      return {
        allowed:                  fs ? fs.allowMinorPosting : true,
        requiresGuardianApproval: fs ? fs.requireGuardianApprovalForMinors : true,
        dailyLimit:               10,
        maxBodyLength:            500,
        allowedScopes:            [...MINOR_ALLOWED_SCOPES],
      };

    case AgeTier.TEEN:
      return {
        allowed:                  fs ? fs.allowMinorPosting : true,
        requiresGuardianApproval: false, // teens post freely; guardian escalation only for scope violations
        dailyLimit:               20,
        maxBodyLength:            1000,
        allowedScopes:            [...TEEN_ALLOWED_SCOPES],
      };

    case AgeTier.UNKNOWN:
      // Conservative: treat like TEEN until age is verified.
      // TODO(Agent 38): Prompt UNKNOWN users to supply DOB during onboarding;
      // re-resolve their policy profile once DOB is confirmed.
      return {
        allowed:                  true,
        requiresGuardianApproval: false,
        dailyLimit:               20,
        maxBodyLength:            1000,
        allowedScopes:            [...TEEN_ALLOWED_SCOPES],
      };

    case AgeTier.ADULT:
    case AgeTier.ELDER:
    default:
      return {
        allowed:                  true,
        requiresGuardianApproval: false,
        dailyLimit:               0,
        maxBodyLength:            2000,
        allowedScopes:            [...ADULT_SCOPES],
      };
  }
}

function inviteDefaults(tier: AgeTier, fs: FounderSettingsData | null): InvitePolicy {
  const minorAllowed = fs ? fs.allowMinorInvites : false;

  switch (tier) {
    case AgeTier.CHILD:
    case AgeTier.PRETEEN:
      return {
        allowed:                  minorAllowed,
        requiresGuardianApproval: true,
        dailyLimit:               minorAllowed ? 2 : 0,
      };

    case AgeTier.TEEN:
      return {
        allowed:                  minorAllowed,
        requiresGuardianApproval: true,
        dailyLimit:               minorAllowed ? 5 : 0,
      };

    case AgeTier.UNKNOWN:
      // Conservative: no invites until age is verified.
      return {
        allowed:                  false,
        requiresGuardianApproval: true,
        dailyLimit:               0,
      };

    case AgeTier.ADULT:
    case AgeTier.ELDER:
    default:
      return {
        allowed:                  true,
        requiresGuardianApproval: false,
        dailyLimit:               0,
      };
  }
}

function visibilityDefaults(tier: AgeTier, fs: FounderSettingsData | null): VisibilityPolicy {
  const adultDefault = fs?.defaultVisibilityScope ?? VisibilityScope.FAMILY;

  switch (tier) {
    case AgeTier.CHILD:
    case AgeTier.PRETEEN:
      return {
        defaultScope:        VisibilityScope.GUARDIAN_ONLY,
        allowedScopes:       [...MINOR_ALLOWED_SCOPES],
        maxScope:            VisibilityScope.FAMILY,
        profileDiscoverable: false,
      };

    case AgeTier.TEEN:
      return {
        defaultScope:        VisibilityScope.FAMILY,
        allowedScopes:       [...TEEN_ALLOWED_SCOPES],
        maxScope:            VisibilityScope.TRUST_UNIT,
        profileDiscoverable: false,
      };

    case AgeTier.UNKNOWN:
      // Conservative: family scope only, not discoverable.
      return {
        defaultScope:        VisibilityScope.FAMILY,
        allowedScopes:       [...TEEN_ALLOWED_SCOPES],
        maxScope:            VisibilityScope.TRUST_UNIT,
        profileDiscoverable: false,
      };

    case AgeTier.ADULT:
    case AgeTier.ELDER:
    default:
      return {
        defaultScope:        adultDefault as VisibilityScope,
        allowedScopes:       [...ADULT_SCOPES],
        maxScope:            VisibilityScope.PUBLIC_APPROVED,
        profileDiscoverable: true,
      };
  }
}

function interestsDefaults(tier: AgeTier): InterestsPolicy {
  const isMinor = isMinorTier(tier) || tier === AgeTier.UNKNOWN;
  return {
    allowCustomCategories:               !isMinor,
    requireGuardianApprovalForNewInterests: isMinor,
    allowedCategoryIds:                  [],  // empty = all network-wide enabled categories; non-empty = guardian per-user restriction (Agent 41+)
  };
}

function limitsDefaults(tier: AgeTier): LimitsPolicy {
  switch (tier) {
    case AgeTier.CHILD:
    case AgeTier.PRETEEN:
      return { dailyPostLimit: 10, dailyInviteLimit: 0, weeklyPostLimit: 50,  dailyCommentLimit: 20 };

    case AgeTier.TEEN:
      return { dailyPostLimit: 20, dailyInviteLimit: 0, weeklyPostLimit: 100, dailyCommentLimit: 30 };

    case AgeTier.UNKNOWN:
      return { dailyPostLimit: 20, dailyInviteLimit: 0, weeklyPostLimit: 100, dailyCommentLimit: 30 };

    case AgeTier.ADULT:
    case AgeTier.ELDER:
    default:
      return { dailyPostLimit: 0,  dailyInviteLimit: 0, weeklyPostLimit: 0,   dailyCommentLimit: 0  };
  }
}

function escalationDefaults(tier: AgeTier, fs: FounderSettingsData | null): EscalationPolicy {
  const requiresApproval = fs ? fs.requireGuardianApprovalForMinors : true;
  const isMinor = isMinorTier(tier);
  const isUnknown = tier === AgeTier.UNKNOWN;

  return {
    requiresGuardianApprovalForSpaceJoin:
      isMinor ? requiresApproval : false,
    requiresGuardianApprovalForTrustExpansion:
      isMinor ? requiresApproval : false,
    requiresGuardianApprovalForPostContent:
      (tier === AgeTier.CHILD || tier === AgeTier.PRETEEN) ? requiresApproval : false,
    autoExpireApprovalAfterHours: 72,
  };
}

// ─── Public factory ────────────────────────────────────────────────────────────

/**
 * Produce a full ResolvedPolicyProfile using system defaults for the given
 * age tier, optionally adjusted by founder-level settings.
 *
 * This is the source-of-truth factory called by:
 *   1. Registration (Agent 38) — to create the initial AihPolicyProfile row.
 *   2. resolvePolicyProfile() — as the baseline before stored JSON overrides.
 *
 * No DB calls. No side effects. Pure function.
 */
export function buildDefaultPolicyProfile(
  userId: string,
  ageTier: AgeTier,
  founderSettings: FounderSettingsData | null,
  sourceType: typeof PolicySourceType[keyof typeof PolicySourceType] = PolicySourceType.SYSTEM_DEFAULT,
): ResolvedPolicyProfile {
  const fs = founderSettings;
  return {
    userId,
    ageTierSnapshot: ageTier,
    sourceType,
    posting:    postingDefaults(ageTier, fs),
    invite:     inviteDefaults(ageTier, fs),
    visibility: visibilityDefaults(ageTier, fs),
    interests:  interestsDefaults(ageTier),
    limits:     limitsDefaults(ageTier),
    escalation: escalationDefaults(ageTier, fs),
  };
}
