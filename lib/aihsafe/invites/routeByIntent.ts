// Agent 73 — route invite creation by intent before email / challenge.

import type { User } from "@prisma/client";
import type { Invite } from "@prisma/client";
import { createInvite } from "@/lib/invite";
import {
  InviteIntent,
  InviteeAgeBracket,
  inferInviteIntent,
  isBusinessInviteIntent,
  isMinorInviteIntent,
  requiresStewardDeclaration,
  type InviteIntent as InviteIntentType,
} from "@/types/aihsafe/invite-intent";
import { buildInviteIntentFields } from "@/lib/aihsafe/invites/invite-fields";

export class InviteRoutingError extends Error {
  constructor(
    message: string,
    public readonly code: string = "INVITE_ROUTING_ERROR",
  ) {
    super(message);
    this.name = "InviteRoutingError";
  }
}

export type RouteInviteByIntentInput = {
  sender:               User;
  recipientEmail:       string;
  relationship?:        string | null;
  inviteIntent?:        InviteIntentType | string | null;
  inviteeAgeBracket?:   string | null;
  stewardDeclaration?:  boolean;
  targetTrustUnitId?:   string | null;
  targetFamilyUnitId?:  string | null;
  /** When false, skips legacy auto trust-unit proposal (default: true for sponsor-only intents). */
  allowAutoTrustUnit?:  boolean;
};

export type RouteInviteResult = {
  invite:              Invite;
  inviteIntent:        string;
  allowAutoTrustUnit:  boolean;
};

export function resolveIntentForCreate(input: RouteInviteByIntentInput): InviteIntentType {
  if (input.inviteIntent && Object.values(InviteIntent).includes(input.inviteIntent as InviteIntentType)) {
    return input.inviteIntent as InviteIntentType;
  }
  return inferInviteIntent({
    relationship:         input.relationship,
    inviteeAgeBracket:    input.inviteeAgeBracket,
    stewardDeclaration:   input.stewardDeclaration,
    business:             isBusinessInviteIntent(input.inviteIntent ?? null),
  });
}

export function validateInviteIntentRouting(input: RouteInviteByIntentInput, intent: InviteIntentType): void {
  if (requiresStewardDeclaration(intent) && !input.stewardDeclaration) {
    throw new InviteRoutingError(
      "Child and teen invites require you to confirm you are their parent, guardian, or family steward.",
      "STEWARD_DECLARATION_REQUIRED",
    );
  }

  if (isBusinessInviteIntent(intent)) {
    if (input.stewardDeclaration) {
      throw new InviteRoutingError(
        "Business invites cannot include a family steward declaration.",
        "BUSINESS_STEWARD_NOT_ALLOWED",
      );
    }
    if (isMinorInviteIntent(intent)) {
      throw new InviteRoutingError("Invalid business invite configuration.", "INVALID_INTENT");
    }
  }

  if (isMinorInviteIntent(intent)) {
    const bracket = input.inviteeAgeBracket;
    if (bracket && bracket !== InviteeAgeBracket.CHILD && bracket !== InviteeAgeBracket.TEEN) {
      throw new InviteRoutingError(
        "Child and teen invites must specify an age bracket of child or teen.",
        "INVALID_AGE_BRACKET",
      );
    }
    if (intent === InviteIntent.CHILD && bracket === InviteeAgeBracket.TEEN) {
      throw new InviteRoutingError("Invite intent child does not match teen age bracket.", "INTENT_BRACKET_MISMATCH");
    }
    if (intent === InviteIntent.TEEN && bracket === InviteeAgeBracket.CHILD) {
      throw new InviteRoutingError("Invite intent teen does not match child age bracket.", "INTENT_BRACKET_MISMATCH");
    }
  }
}

/** Create invite row with intent fields; caller sends email and optional auto-TU. */
export async function routeInviteByIntent(input: RouteInviteByIntentInput): Promise<RouteInviteResult> {
  const intent = resolveIntentForCreate(input);
  validateInviteIntentRouting(input, intent);

  const relationship =
    input.relationship ??
    (isMinorInviteIntent(intent) ? "child" : isBusinessInviteIntent(intent) ? "other" : "frnd");

  const intentFields = buildInviteIntentFields({
    senderId:           input.sender.id,
    inviteIntent:       intent,
    relationship,
    inviteeAgeBracket:  input.inviteeAgeBracket ?? (isMinorInviteIntent(intent) ? intent : InviteeAgeBracket.ADULT),
    stewardDeclaration: input.stewardDeclaration ?? false,
    targetTrustUnitId:  input.targetTrustUnitId,
    targetFamilyUnitId: input.targetFamilyUnitId,
  });

  const invite = await createInvite(input.sender, input.recipientEmail, relationship, intentFields);

  const allowAutoTrustUnit =
    input.allowAutoTrustUnit !== false &&
    (intent === InviteIntent.ADULT_FRIEND || intent === InviteIntent.FAMILY_ADULT);

  return { invite, inviteIntent: intent, allowAutoTrustUnit };
}
