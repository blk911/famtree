// User-facing invite flow copy (Agent 75 + Agent 77 adult child).

/** Compose + page hero heading */
export const WHO_ARE_YOU_INVITING_HEADING = "Who Are You Inviting?";

export type InviteKind = "friend" | "family" | "family_youth" | "trusted_adult" | "business";

/** Age path within Child / teen / adult child invite. */
export type FamilyYouthAgeGroup = "under_13" | "teen_13_17" | "over_18";

export const INVITE_KINDS: {
  id:          InviteKind;
  label:       string;
  description: string;
}[] = [
  {
    id:          "friend",
    label:       "Friend / Trusted Contact",
    description:
      "Someone you trust who joins as your contact. They will not manage children or family settings for you.",
  },
  {
    id:          "family",
    label:       "Family Member",
    description:
      "An adult in your family network (sibling, spouse, cousin, etc.). You stay connected as their sponsor; this does not give them control over children.",
  },
  {
    id:          "family_youth",
    label:       "Child / Teen / Adult Child",
    description:
      "A son, daughter, or young family member. Under 18 joins with Boundaries; 18+ joins as an adult family member without child Boundaries.",
  },
  {
    id:          "trusted_adult",
    label:       "Trusted Adult",
    description:
      "An adult you authorize to support your family (for example a coach or relative). They do not become your family’s account owner.",
  },
  {
    id:          "business",
    label:       "Work / Business Member",
    description:
      "Work members join a workspace relationship, not a family role. They will not manage family Boundaries or children.",
  },
];

export const STEWARD_DECLARATION_LABEL =
  "Are you this child’s parent, guardian, or family steward?";

export const MINOR_BOUNDARIES_NOTE =
  "Children and teens join with Boundaries turned on by default. You will help guide their trusted spaces and visibility.";

export const ADULT_CHILD_NOTE =
  "Adult family members join trusted family spaces without child Boundaries. They are not managed like a teen account.";

export const BUSINESS_WORKSPACE_NOTE =
  "Work members join a workspace relationship, not a family role.";

export const FAMILY_YOUTH_AGE_GROUPS: { id: FamilyYouthAgeGroup; label: string }[] = [
  { id: "under_13",    label: "Under 13" },
  { id: "teen_13_17",  label: "13–17" },
  { id: "over_18",     label: "18+" },
];

export function inviteEmailSubject(kind: InviteKind): string {
  switch (kind) {
    case "friend":
      return "You've been invited to connect on AMIHUMAN.NET";
    case "family":
      return "You've been invited to join our family network";
    case "family_youth":
      return "You've been invited to join our family network";
    case "trusted_adult":
      return "You've been invited as a trusted adult";
    case "business":
      return "You've been invited to a work space on AMIHUMAN.NET";
  }
}

export function inviteKindLabel(kind: InviteKind): string {
  return INVITE_KINDS.find((k) => k.id === kind)?.label ?? kind;
}

export function confirmChecklist(kind: InviteKind, youthAge?: FamilyYouthAgeGroup): string[] {
  switch (kind) {
    case "friend":
      return [
        "Invite email sent right away",
        "They identify you from your photo to unlock signup",
        "You become their sponsor contact — not a family manager",
        "Shows as Pending until they join",
      ];
    case "family":
      return [
        "Invite email sent right away",
        "They identify you from your photo to unlock signup",
        "They join your family network as an adult member",
        "Shows as Pending until they join",
      ];
    case "family_youth":
      if (youthAge === "over_18") {
        return [
          "Invite email sent right away",
          "They identify you from your photo to unlock signup",
          "They join as an adult family member — no child Boundaries",
          "They can participate in your trusted family spaces",
        ];
      }
      return [
        "Invite email sent right away",
        "They identify you from your photo to unlock signup",
        "They sign up with Boundaries on by default",
        "You are recorded as their parent, guardian, or family steward",
      ];
    case "trusted_adult":
      return [
        "Invite email sent right away",
        "They identify you from your photo to unlock signup",
        "They join as a trusted adult — not as a child account",
        "You can link them to family members after they join",
      ];
    case "business":
      return [
        "Invite email sent right away",
        "They identify you from your photo to unlock signup",
        "They join a work space — not a family role",
        "Shows as Pending until they join",
      ];
  }
}

export function previewBodyLine(
  kind: InviteKind,
  recipientFirstName?: string,
  youthAge?: FamilyYouthAgeGroup,
): string {
  const hi = recipientFirstName ? `Hi ${recipientFirstName},` : "Hello,";
  switch (kind) {
    case "friend":
      return `${hi} You've been invited to connect as a trusted contact.`;
    case "family":
      return `${hi} You've been invited to join our family network.`;
    case "family_youth":
      if (youthAge === "over_18") {
        return `${hi} You've been invited to join our family network as an adult family member.`;
      }
      return `${hi} You've been invited to join with family Boundaries.`;
    case "trusted_adult":
      return `${hi} You've been invited as a trusted adult in our network.`;
    case "business":
      return `${hi} You've been invited to a work space on AMIHUMAN.NET.`;
  }
}

/** Map UI kind + age group → API inviteIntent. */
export function inviteIntentForKind(
  kind: InviteKind,
  opts: { relationship: string; youthAge: FamilyYouthAgeGroup },
): string {
  switch (kind) {
    case "friend":
      return "adult_friend";
    case "family":
      return "family_adult";
    case "family_youth":
      if (opts.youthAge === "over_18") return "adult_child";
      if (opts.youthAge === "teen_13_17") return "teen";
      return "child";
    case "trusted_adult":
      return "trusted_adult";
    case "business":
      return "business_member";
  }
}

/** Map UI age group → persisted inviteeAgeBracket. */
export function inviteeAgeBracketForYouth(age: FamilyYouthAgeGroup): string {
  switch (age) {
    case "under_13":
      return "child";
    case "teen_13_17":
      return "teen";
    case "over_18":
      return "adult";
  }
}

export function defaultRelationshipForKind(
  kind: InviteKind,
  relationship: string,
): string {
  if (kind === "friend") return "frnd";
  if (kind === "family_youth") return "child";
  if (kind === "business" || kind === "trusted_adult") return "other";
  return relationship || "other";
}

/** @deprecated Agent 75 — map legacy "minor" kind id if needed */
export type LegacyInviteKind = InviteKind | "minor";
