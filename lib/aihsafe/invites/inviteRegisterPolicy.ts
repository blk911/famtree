// Pure invite → registration policy helpers (Agent 74 QA / enforcement).

import type { Invite } from "@prisma/client";
import { deriveAgeTier } from "@/lib/aihsafe/governance";
import { AgeTier, isMinorTier } from "@/types/aihsafe/age-tiers";
import {
  InviteIntent,
  InviteeAgeBracket,
  isBusinessInviteIntent,
  isMinorInviteIntent,
  isSponsorOnlyIntent,
} from "@/types/aihsafe/invite-intent";
import { resolveInviteIntentFromRow } from "@/lib/aihsafe/invites/invite-fields";

/** Legacy auto trust-unit slots apply only to peer/family adult sponsor invites. */
export function shouldResolveTrustUnitPendingOnRegister(intent: string | null | undefined): boolean {
  if (!intent) return true;
  return isSponsorOnlyIntent(intent);
}

/** Invitee must never receive site founder role from invite materialization. */
export function roleForInviteRegistration(isFirstUserInDb: boolean): "founder" | "member" {
  return isFirstUserInDb ? "founder" : "member";
}

export function validateInviteAgeBracketMatchesTier(
  invite: Invite,
  dateOfBirth: Date,
): { ok: true } | { ok: false; code: string; message: string } {
  const intent = resolveInviteIntentFromRow(invite);
  if (!isMinorInviteIntent(intent)) return { ok: true };

  const tier = deriveAgeTier(dateOfBirth);
  const bracket = invite.inviteeAgeBracket;

  if (intent === InviteIntent.CHILD) {
    if (tier === AgeTier.TEEN) {
      return {
        ok:      false,
        code:    "DOB_TIER_MISMATCH",
        message: "This invite is for a child under 13. The date of birth entered indicates a teen account.",
      };
    }
    if (tier !== AgeTier.CHILD && tier !== AgeTier.PRETEEN) {
      return {
        ok:      false,
        code:    "DOB_NOT_MINOR",
        message: "This invite is for a child account. The date of birth entered does not match.",
      };
    }
  }

  if (intent === InviteIntent.TEEN) {
    if (tier !== AgeTier.TEEN) {
      return {
        ok:      false,
        code:    "DOB_TIER_MISMATCH",
        message: "This invite is for a teen (13–17). The date of birth entered does not match.",
      };
    }
  }

  if (bracket === InviteeAgeBracket.CHILD && tier === AgeTier.TEEN) {
    return {
      ok:      false,
      code:    "BRACKET_TIER_MISMATCH",
      message: "Invite age bracket (child) does not match the date of birth provided.",
    };
  }
  if (bracket === InviteeAgeBracket.TEEN && tier !== AgeTier.TEEN) {
    return {
      ok:      false,
      code:    "BRACKET_TIER_MISMATCH",
      message: "Invite age bracket (teen) does not match the date of birth provided.",
    };
  }

  return { ok: true };
}

export function validateTrustedAdultInviteeAge(
  invite: Invite,
  dateOfBirth: Date | null,
): { ok: true } | { ok: false; code: string; message: string } {
  if (resolveInviteIntentFromRow(invite) !== InviteIntent.TRUSTED_ADULT) return { ok: true };
  if (!dateOfBirth) {
    return {
      ok:      false,
      code:    "DOB_REQUIRED",
      message: "Date of birth is required so we can confirm a trusted adult account.",
    };
  }
  if (isMinorTier(deriveAgeTier(dateOfBirth))) {
    return {
      ok:      false,
      code:    "TRUSTED_ADULT_MUST_BE_ADULT",
      message: "Trusted adult invites are for adult accounts only.",
    };
  }
  return { ok: true };
}

export function validateBusinessInviteShape(
  invite: Invite,
): { ok: true } | { ok: false; code: string; message: string } {
  if (!isBusinessInviteIntent(resolveInviteIntentFromRow(invite))) return { ok: true };
  if (invite.stewardDeclaration) {
    return {
      ok:      false,
      code:    "INVALID_BUSINESS_INVITE",
      message: "Business invites cannot include family steward authority.",
    };
  }
  return { ok: true };
}
