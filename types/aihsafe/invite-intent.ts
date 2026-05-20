// AIH Safe — Invite intent taxonomy (Agent 73 routing foundation).

export const InviteIntent = {
  ADULT_FRIEND:     "adult_friend",
  FAMILY_ADULT:     "family_adult",
  /** Son/daughter or family member 18+ — family circle, not Boundaries / not friend sponsor. */
  ADULT_CHILD:      "adult_child",
  CHILD:            "child",
  TEEN:             "teen",
  TRUSTED_ADULT:    "trusted_adult",
  BUSINESS_MEMBER:  "business_member",
  BUSINESS_ADMIN:   "business_admin",
} as const;
export type InviteIntent = (typeof InviteIntent)[keyof typeof InviteIntent];

export const INVITE_INTENTS = Object.values(InviteIntent);

export const InviteeAgeBracket = {
  CHILD:   "child",
  TEEN:    "teen",
  ADULT:   "adult",
  UNKNOWN: "unknown",
} as const;
export type InviteeAgeBracket = (typeof InviteeAgeBracket)[keyof typeof InviteeAgeBracket];

export const INVITEE_AGE_BRACKETS = Object.values(InviteeAgeBracket);

const MINOR_INTENTS: readonly InviteIntent[] = [
  InviteIntent.CHILD,
  InviteIntent.TEEN,
];

const BUSINESS_INTENTS: readonly InviteIntent[] = [
  InviteIntent.BUSINESS_MEMBER,
  InviteIntent.BUSINESS_ADMIN,
];

export function isMinorInviteIntent(intent: string | null | undefined): boolean {
  return intent != null && (MINOR_INTENTS as readonly string[]).includes(intent);
}

export function isAdultChildInviteIntent(intent: string | null | undefined): boolean {
  return intent === InviteIntent.ADULT_CHILD;
}

/** Family participants (not friends/business) — share family-unit semantics. */
export function isFamilyParticipantIntent(intent: string | null | undefined): boolean {
  return (
    intent === InviteIntent.FAMILY_ADULT ||
    intent === InviteIntent.ADULT_CHILD ||
    isMinorInviteIntent(intent)
  );
}

export function isBusinessInviteIntent(intent: string | null | undefined): boolean {
  return intent != null && (BUSINESS_INTENTS as readonly string[]).includes(intent);
}

export function requiresStewardDeclaration(intent: string | null | undefined): boolean {
  return isMinorInviteIntent(intent);
}

export function requiresDateOfBirthAtRegister(intent: string | null | undefined): boolean {
  return isMinorInviteIntent(intent) || isAdultChildInviteIntent(intent);
}

/** Sponsor-only intents — no guardian link or family steward side effects. */
export function isSponsorOnlyIntent(intent: string | null | undefined): boolean {
  return intent === InviteIntent.ADULT_FRIEND || intent === InviteIntent.FAMILY_ADULT;
}

export function defaultRelationshipKind(intent: InviteIntent): string {
  switch (intent) {
    case InviteIntent.CHILD:
    case InviteIntent.TEEN:
      return "family_minor";
    case InviteIntent.ADULT_CHILD:
      return "adult_child";
    case InviteIntent.TRUSTED_ADULT:
      return "trusted_adult";
    case InviteIntent.BUSINESS_MEMBER:
    case InviteIntent.BUSINESS_ADMIN:
      return "business";
    case InviteIntent.FAMILY_ADULT:
      return "family_adult";
    default:
      return "sponsor";
  }
}

/** Map legacy relationship tag + UI hints to intent when client omits inviteIntent. */
export function inferInviteIntent(opts: {
  relationship?: string | null;
  inviteeAgeBracket?: string | null;
  stewardDeclaration?: boolean;
  business?: boolean;
}): InviteIntent {
  if (opts.business) {
    return InviteIntent.BUSINESS_MEMBER;
  }
  const bracket = opts.inviteeAgeBracket;
  if (bracket === InviteeAgeBracket.CHILD && opts.stewardDeclaration) {
    return InviteIntent.CHILD;
  }
  if (bracket === InviteeAgeBracket.TEEN && opts.stewardDeclaration) {
    return InviteIntent.TEEN;
  }
  if (bracket === InviteeAgeBracket.ADULT) {
    if (opts.relationship === "child" || opts.relationship === "parent") {
      return InviteIntent.ADULT_CHILD;
    }
  }
  if (opts.relationship === "parent" && opts.stewardDeclaration) {
    return InviteIntent.CHILD;
  }
  if (opts.relationship === "child" && opts.stewardDeclaration) {
    return InviteIntent.CHILD;
  }
  if (opts.relationship === "frnd") {
    return InviteIntent.ADULT_FRIEND;
  }
  if (
    opts.relationship === "parent" ||
    opts.relationship === "sibling" ||
    opts.relationship === "spouse" ||
    opts.relationship === "so"
  ) {
    return InviteIntent.FAMILY_ADULT;
  }
  return InviteIntent.ADULT_FRIEND;
}
