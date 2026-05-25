// GET /api/aihsafe/family-governance — family-wide settings + caller's resolved policy (read-only).
// All authenticated Family Safe users may read; only founders/admins may PATCH founder-settings.

export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";
import { resolvePolicyProfile } from "@/lib/aihsafe/policy";
import { ok, unauthenticated, serverError } from "@/lib/aihsafe/api/envelopes";
import type {
  FounderSettingsDTO,
  FamilyGovernanceViewDTO,
  PersonalGovernanceDTO,
} from "@/types/aihsafe/dto";
import type { ResolvedPolicyProfile } from "@/types/aihsafe/policy";

function toFounderDTO(row: {
  id: string;
  requireGuardianApprovalForMinors: boolean;
  allowMinorInvites: boolean;
  allowMinorPosting: boolean;
  allowMinorExternalLinks: boolean;
  defaultVisibilityScope: string;
  enableTrustedAdults: boolean;
  enablePrivateThreads: boolean;
  updatedAt: Date;
}): FounderSettingsDTO {
  return {
    id: row.id,
    requireGuardianApprovalForMinors: row.requireGuardianApprovalForMinors,
    allowMinorInvites: row.allowMinorInvites,
    allowMinorPosting: row.allowMinorPosting,
    allowMinorExternalLinks: row.allowMinorExternalLinks,
    defaultVisibilityScope: row.defaultVisibilityScope,
    enableTrustedAdults: row.enableTrustedAdults,
    enablePrivateThreads: row.enablePrivateThreads,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toPersonalDTO(profile: ResolvedPolicyProfile, family: FounderSettingsDTO): PersonalGovernanceDTO {
  return {
    ageTierSnapshot: profile.ageTierSnapshot,
    postingAllowed: profile.posting.allowed,
    postingRequiresGuardianApproval:
      profile.posting.requiresGuardianApproval ||
      profile.escalation.requiresGuardianApprovalForPostContent,
    dailyPostLimit: profile.limits.dailyPostLimit || profile.posting.dailyLimit,
    dailyInviteLimit: profile.limits.dailyInviteLimit || profile.invite.dailyLimit,
    defaultVisibility: profile.visibility.defaultScope,
    allowedVisibilityScopes: profile.visibility.allowedScopes,
    inviteAllowed: profile.invite.allowed,
    privateThreadsEnabled: family.enablePrivateThreads,
    trustedAdultsEnabled: family.enableTrustedAdults,
  };
}

export async function GET() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthenticated();
  }

  try {
    const row = await prisma.aihFounderSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", founderUserId: user.id },
      update: {},
    });
    const family = toFounderDTO(row);
    const profile = await resolvePolicyProfile(user.id);
    const personal = toPersonalDTO(profile, family);
    return ok<FamilyGovernanceViewDTO>({ family, personal });
  } catch (err) {
    console.error("[family-governance GET]", err);
    return serverError();
  }
}
