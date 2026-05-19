// Agent 73 — apply invite-intent side effects after registration (idempotent).

import type { Invite } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { deriveAgeTier } from "@/lib/aihsafe/governance";
import { AgeTier, isMinorTier } from "@/types/aihsafe/age-tiers";
import {
  InviteIntent,
  isBusinessInviteIntent,
  isMinorInviteIntent,
  isSponsorOnlyIntent,
} from "@/types/aihsafe/invite-intent";
import { resolveInviteIntentFromRow } from "@/lib/aihsafe/invites/invite-fields";
import { ensurePolicyProfile } from "@/lib/aihsafe/policy";
import { PolicySourceType } from "@/types/aihsafe/policy";
import { buildDefaultPolicyProfile } from "@/lib/aihsafe/policy/defaults";

async function loadFounderSettingsForPolicy() {
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
    defaultVisibilityScope:           row.defaultVisibilityScope as "family",
    enableTrustedAdults:              row.enableTrustedAdults,
    enablePrivateThreads:             row.enablePrivateThreads,
  };
}

/** Conservative child/teen policy defaults for invite-origin minors. */
async function applyMinorInvitePolicyDefaults(userId: string, ageTier: AgeTier): Promise<void> {
  if (!isMinorTier(ageTier)) return;

  const founderSettings = await loadFounderSettingsForPolicy();
  const fresh = buildDefaultPolicyProfile(
    userId,
    ageTier,
    founderSettings,
    founderSettings ? PolicySourceType.FOUNDER_DEFAULT : PolicySourceType.SYSTEM_DEFAULT,
  );

  const visibility = {
    ...fresh.visibility,
    defaultScope:    "family" as const,
    allowedScopes:   ["family", "trust_unit"] as const,
  };
  const posting = {
    ...fresh.posting,
    allowed:                  founderSettings?.allowMinorPosting ?? false,
    requiresGuardianApproval: true,
  };
  const invite = {
    ...fresh.invite,
    allowed:                  false,
    requiresGuardianApproval: true,
  };
  const escalation = {
    ...fresh.escalation,
    requiresGuardianApproval: true,
  };

  await prisma.aihPolicyProfile.upsert({
    where:  { userId },
    create: {
      userId,
      ageTierSnapshot:  ageTier,
      sourceType:       fresh.sourceType,
      postingPolicy:    posting as object,
      invitePolicy:     invite as object,
      visibilityPolicy: visibility as object,
      escalationPolicy: escalation as object,
      limitsPolicy:     fresh.limits as object,
    },
    update: {
      ageTierSnapshot:  ageTier,
      postingPolicy:    posting as object,
      invitePolicy:     invite as object,
      visibilityPolicy: visibility as object,
      escalationPolicy: escalation as object,
    },
  });
}

async function upsertGuardianLink(
  guardianUserId: string,
  childUserId: string,
  kind: "parent" | "trusted_adult",
): Promise<void> {
  await prisma.aihGuardianRelationship.upsert({
    where: {
      guardianUserId_childUserId: { guardianUserId, childUserId },
    },
    create: {
      guardianUserId,
      childUserId,
      kind,
      permissionLevel: "approver",
    },
    update: {
      kind,
      permissionLevel: "approver",
      revokedAt:         null,
    },
  });
}

async function attachToFamilyUnit(
  stewardUserId: string,
  childUserId: string,
  familyUnitId: string | null,
): Promise<void> {
  let unitId = familyUnitId;

  if (!unitId) {
    const existing = await prisma.aihFamilyUnitMember.findFirst({
      where: {
        userId:   stewardUserId,
        exitedAt: null,
        familyUnit: { status: "active" },
      },
      select: { familyUnitId: true },
    });
    unitId = existing?.familyUnitId ?? null;
  }

  if (!unitId) {
    const steward = await prisma.user.findUnique({
      where:  { id: stewardUserId },
      select: { firstName: true, lastName: true },
    });
    const name = steward
      ? `${steward.firstName} ${steward.lastName}`.trim() + " Family"
      : "Family";
    const unit = await prisma.aihFamilyUnit.create({
      data: {
        name,
        createdByUserId: stewardUserId,
        members: {
          create: [{ userId: stewardUserId, role: "guardian" }],
        },
      },
    });
    unitId = unit.id;
  }

  await prisma.aihFamilyUnitMember.upsert({
    where: {
      familyUnitId_userId: { familyUnitId: unitId, userId: stewardUserId },
    },
    create: { familyUnitId: unitId, userId: stewardUserId, role: "guardian" },
    update: { exitedAt: null },
  });

  await prisma.aihFamilyUnitMember.upsert({
    where: {
      familyUnitId_userId: { familyUnitId: unitId, userId: childUserId },
    },
    create: { familyUnitId: unitId, userId: childUserId, role: "child" },
    update: { exitedAt: null },
  });
}

async function attachToTrustUnit(trustUnitId: string, userId: string): Promise<void> {
  await prisma.trustUnitMember.upsert({
    where: {
      trustUnitId_userId: { trustUnitId, userId },
    },
    create: { trustUnitId, userId },
    update: {},
  });
}

/**
 * Apply governance outcomes for a consumed invite. Safe to call once after user creation.
 * Does not change User.role (never promotes inviter or invitee to site founder).
 */
export async function materializeInviteOutcome(
  userId: string,
  invite: Invite,
  dateOfBirth: Date | null,
): Promise<void> {
  const intent = resolveInviteIntentFromRow(invite);
  const stewardId = invite.stewardUserId ?? (invite.stewardDeclaration ? invite.senderId : null);

  await ensurePolicyProfile(userId, dateOfBirth);

  if (isMinorInviteIntent(intent)) {
    const tier = deriveAgeTier(dateOfBirth);
    if (!isMinorTier(tier)) {
      console.warn("[materializeInviteOutcome] minor intent but non-minor age tier", {
        userId,
        inviteId: invite.id,
        tier,
      });
      return;
    }
    await applyMinorInvitePolicyDefaults(userId, tier);

    if (!stewardId) {
      throw new Error(
        `[materializeInviteOutcome] minor invite ${invite.id} missing steward — registration should have been blocked`,
      );
    }
    await upsertGuardianLink(stewardId, userId, "parent");
    await attachToFamilyUnit(stewardId, userId, invite.targetFamilyUnitId);
    return;
  }

  if (isBusinessInviteIntent(intent)) {
    if (invite.targetTrustUnitId) {
      await attachToTrustUnit(invite.targetTrustUnitId, userId);
    }
    return;
  }

  // Trusted-adult invitees are adults; guardian↔child links are created via People tab
  // (requires a specific child). Do not treat the invitee as a governed minor.
  if (intent === InviteIntent.TRUSTED_ADULT) {
    return;
  }

  if (intent === InviteIntent.FAMILY_ADULT && invite.targetFamilyUnitId) {
    await prisma.aihFamilyUnitMember.upsert({
      where: {
        familyUnitId_userId: {
          familyUnitId: invite.targetFamilyUnitId,
          userId,
        },
      },
      create: {
        familyUnitId: invite.targetFamilyUnitId,
        userId,
        role:         "adult",
      },
      update: { exitedAt: null },
    });
    return;
  }

  if (isSponsorOnlyIntent(intent)) {
    return;
  }
}
