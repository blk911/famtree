// AIH Safe — Policy profile resolver.
//
// Loads the effective ResolvedPolicyProfile for a user by merging:
//   1. System defaults for their age tier          (buildDefaultPolicyProfile)
//   2. Network-level founder settings overrides     (AihFounderSettings row)
//   3. Stored per-user JSON overrides               (AihPolicyProfile JSON blobs)
//
// Merge precedence (highest wins):
//   stored per-user override  >  founder default  >  system default
//
// This function is the ONLY place that reads AihPolicyProfile and
// AihFounderSettings and merges them. All callers get a single
// ResolvedPolicyProfile regardless of which overrides are in place.

import { prisma } from "@/lib/db/prisma";
import { deriveAgeTier } from "@/lib/aihsafe/governance";
import { AgeTier } from "@/types/aihsafe/age-tiers";
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
import { buildDefaultPolicyProfile } from "./defaults";

// ─── Founder settings loader ──────────────────────────────────────────────────

/**
 * Load the singleton AihFounderSettings row, or null if none exists.
 * Agent 39 will create/upsert this row via the founder settings API.
 */
async function loadFounderSettings(): Promise<FounderSettingsData | null> {
  const row = await prisma.aihFounderSettings.findFirst({
    select: {
      requireGuardianApprovalForMinors: true,
      allowMinorInvites:                true,
      allowMinorPosting:                true,
      allowMinorExternalLinks:          true,
      defaultVisibilityScope:           true,
      enableTrustedAdults:              true,
      enablePrivateThreads:             true,
    },
  });
  if (!row) return null;
  return {
    requireGuardianApprovalForMinors: row.requireGuardianApprovalForMinors,
    allowMinorInvites:                row.allowMinorInvites,
    allowMinorPosting:                row.allowMinorPosting,
    allowMinorExternalLinks:          row.allowMinorExternalLinks,
    defaultVisibilityScope:           row.defaultVisibilityScope as any,
    enableTrustedAdults:              row.enableTrustedAdults,
    enablePrivateThreads:             row.enablePrivateThreads,
  };
}

// ─── JSON blob merge helper ───────────────────────────────────────────────────

/**
 * Merge a stored JSON blob (partial override) onto top of a default sub-policy.
 * Only defined keys in the stored blob are applied — undefined keys keep default.
 * Uses JSON parse/stringify round-trip because Prisma Json fields may come back
 * as opaque objects depending on the client version.
 */
function mergeSubPolicy<T extends object>(defaults: T, stored: unknown): T {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return defaults;
  return { ...defaults, ...(stored as Partial<T>) };
}

// ─── resolvePolicyProfile ─────────────────────────────────────────────────────

/**
 * Return the fully-resolved policy for a given user.
 *
 * Resolution steps:
 *   1. Load user DOB to derive current age tier.
 *   2. Load AihFounderSettings (network-level overrides).
 *   3. Build system+founder default profile for this tier.
 *   4. Load AihPolicyProfile stored JSON blobs.
 *   5. Merge stored blobs onto defaults (stored wins field-by-field).
 *   6. Return ResolvedPolicyProfile.
 *
 * Returns system defaults if no AihPolicyProfile row exists — callers
 * do not need to create the row first to get a safe policy.
 */
export async function resolvePolicyProfile(userId: string): Promise<ResolvedPolicyProfile> {
  // 1. Load user for DOB
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { dateOfBirth: true },
  });
  const ageTier = deriveAgeTier(user?.dateOfBirth ?? null);

  // 2. Load founder settings
  const founderSettings = await loadFounderSettings();

  // 3. Build baseline from system + founder defaults
  const sourceType = founderSettings
    ? PolicySourceType.FOUNDER_DEFAULT
    : PolicySourceType.SYSTEM_DEFAULT;
  const base = buildDefaultPolicyProfile(userId, ageTier, founderSettings, sourceType);

  // 4. Load stored per-user overrides
  const stored = await prisma.aihPolicyProfile.findUnique({
    where:  { userId },
    select: {
      sourceType:      true,
      postingPolicy:   true,
      invitePolicy:    true,
      visibilityPolicy:true,
      escalationPolicy:true,
      interestsPolicy: true,
      limitsPolicy:    true,
    },
  });

  if (!stored) {
    // No stored profile — return system/founder defaults as-is.
    return base;
  }

  // 5. Merge stored JSON blobs onto baseline defaults.
  // Stored blobs are Partial overrides; undefined fields keep the default value.
  const resolvedSourceType =
    (stored.sourceType as typeof PolicySourceType[keyof typeof PolicySourceType]) ?? base.sourceType;

  return {
    userId,
    ageTierSnapshot: ageTier,
    sourceType: resolvedSourceType,
    posting:    mergeSubPolicy<PostingPolicy>(base.posting, stored.postingPolicy),
    invite:     mergeSubPolicy<InvitePolicy>(base.invite, stored.invitePolicy),
    visibility: mergeSubPolicy<VisibilityPolicy>(base.visibility, stored.visibilityPolicy),
    interests:  mergeSubPolicy<InterestsPolicy>(base.interests, stored.interestsPolicy),
    limits:     mergeSubPolicy<LimitsPolicy>(base.limits, stored.limitsPolicy),
    escalation: mergeSubPolicy<EscalationPolicy>(base.escalation, stored.escalationPolicy),
  };
}

// ─── ensurePolicyProfile ──────────────────────────────────────────────────────

/**
 * Convenience wrapper for post-registration use.
 * Derives age tier from dateOfBirth, loads founder settings, then upserts the
 * AihPolicyProfile row with safe defaults. Idempotent — safe to call multiple times.
 *
 * Called by: registration route (immediately after user creation)
 */
export async function ensurePolicyProfile(
  userId: string,
  dateOfBirth: Date | null,
): Promise<void> {
  const ageTier = deriveAgeTier(dateOfBirth);
  const founderSettings = await loadFounderSettings();
  await createDefaultPolicyProfileRow(userId, ageTier, founderSettings);
}

// ─── refreshPolicySnapshotIfTierChanged ───────────────────────────────────────

/**
 * On login: detect whether the stored ageTierSnapshot has drifted from the
 * current live tier (e.g. user has aged from TEEN to ADULT, or DOB was
 * added after registration). If so, re-derive policy defaults for the new
 * tier and write them into the profile row.
 *
 * Only JSON blobs managed by the system are refreshed. interestsPolicy is
 * preserved because it may contain user-specific category selections (Agent 40).
 *
 * Safe to call fire-and-forget: `.catch(console.error)`.
 */
export async function refreshPolicySnapshotIfTierChanged(userId: string): Promise<void> {
  const [user, stored] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { dateOfBirth: true } }),
    prisma.aihPolicyProfile.findUnique({ where: { userId }, select: { ageTierSnapshot: true } }),
  ]);

  if (!user || !stored) return; // no profile row yet — ensurePolicyProfile handles creation

  const currentTier = deriveAgeTier(user.dateOfBirth ?? null);
  if ((stored.ageTierSnapshot as AgeTier) === currentTier) return; // no drift

  const founderSettings = await loadFounderSettings();
  const fresh = buildDefaultPolicyProfile(
    userId,
    currentTier,
    founderSettings,
    founderSettings ? PolicySourceType.FOUNDER_DEFAULT : PolicySourceType.SYSTEM_DEFAULT,
  );

  await prisma.aihPolicyProfile.update({
    where: { userId },
    data: {
      ageTierSnapshot:  currentTier,
      sourceType:       fresh.sourceType,
      postingPolicy:    fresh.posting    as object,
      invitePolicy:     fresh.invite     as object,
      visibilityPolicy: fresh.visibility as object,
      escalationPolicy: fresh.escalation as object,
      limitsPolicy:     fresh.limits     as object,
      // interestsPolicy intentionally preserved
    },
  });
}

// ─── createDefaultPolicyProfileRow ────────────────────────────────────────────

/**
 * Persist a default AihPolicyProfile row for a newly registered user.
 * Called by the registration route (Agent 38) immediately after user creation.
 *
 * If a row already exists (idempotent re-call), the existing row is returned
 * unchanged — no overwrite.
 *
 * Returns the resolved profile so the caller does not need a second DB round-trip.
 */
export async function createDefaultPolicyProfileRow(
  userId: string,
  ageTier: AgeTier,
  founderSettings: FounderSettingsData | null,
): Promise<ResolvedPolicyProfile> {
  const profile = buildDefaultPolicyProfile(
    userId,
    ageTier,
    founderSettings,
    founderSettings ? PolicySourceType.FOUNDER_DEFAULT : PolicySourceType.SYSTEM_DEFAULT,
  );

  await prisma.aihPolicyProfile.upsert({
    where:  { userId },
    create: {
      userId,
      ageTierSnapshot: profile.ageTierSnapshot,
      sourceType:      profile.sourceType,
      postingPolicy:   profile.posting    as any,
      invitePolicy:    profile.invite     as any,
      visibilityPolicy:profile.visibility as any,
      escalationPolicy:profile.escalation as any,
      interestsPolicy: profile.interests  as any,
      limitsPolicy:    profile.limits     as any,
    },
    update: {
      // Do not overwrite if row already exists — preserve any manual overrides.
    },
  });

  return profile;
}
