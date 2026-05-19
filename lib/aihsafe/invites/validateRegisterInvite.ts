import type { Invite } from "@prisma/client";
import { deriveAgeTier } from "@/lib/aihsafe/governance";
import { isMinorTier } from "@/types/aihsafe/age-tiers";
import {
  requiresDateOfBirthAtRegister,
  isMinorInviteIntent,
  isBusinessInviteIntent,
} from "@/types/aihsafe/invite-intent";
import { resolveInviteIntentFromRow } from "@/lib/aihsafe/invites/invite-fields";
import {
  validateBusinessInviteShape,
  validateInviteAgeBracketMatchesTier,
  validateTrustedAdultInviteeAge,
} from "@/lib/aihsafe/invites/inviteRegisterPolicy";

export class InviteRegisterValidationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "InviteRegisterValidationError";
  }
}

export function validateRegistrationAgainstInvite(
  invite: Invite,
  dateOfBirth: Date | null,
): void {
  const intent = resolveInviteIntentFromRow(invite);

  if (requiresDateOfBirthAtRegister(intent) && !dateOfBirth) {
    throw new InviteRegisterValidationError(
      "Date of birth is required for this family invite so we can apply the right Boundaries.",
      "DOB_REQUIRED",
    );
  }

  const businessCheck = validateBusinessInviteShape(invite);
  if (!businessCheck.ok) {
    throw new InviteRegisterValidationError(businessCheck.message, businessCheck.code);
  }

  const trustedCheck = validateTrustedAdultInviteeAge(invite, dateOfBirth);
  if (!trustedCheck.ok) {
    throw new InviteRegisterValidationError(trustedCheck.message, trustedCheck.code);
  }

  if (isMinorInviteIntent(intent)) {
    if (!dateOfBirth) {
      throw new InviteRegisterValidationError(
        "Date of birth is required for child and teen accounts.",
        "DOB_REQUIRED",
      );
    }
    const tier = deriveAgeTier(dateOfBirth);
    if (!isMinorTier(tier)) {
      throw new InviteRegisterValidationError(
        "This invite is for a child or teen account. The date of birth entered indicates an adult account.",
        "DOB_NOT_MINOR",
      );
    }
    if (!invite.stewardDeclaration) {
      throw new InviteRegisterValidationError(
        "This invite is missing a family steward declaration. Ask your inviter to send a new invite.",
        "STEWARD_DECLARATION_MISSING",
      );
    }
    const bracketCheck = validateInviteAgeBracketMatchesTier(invite, dateOfBirth);
    if (!bracketCheck.ok) {
      throw new InviteRegisterValidationError(bracketCheck.message, bracketCheck.code);
    }
  }
}
