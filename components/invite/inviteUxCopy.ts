// User-facing invite flow copy (Agent 75) — no policy/founder/admin jargon.

export type InviteKind = "friend" | "family" | "minor" | "trusted_adult" | "business";

export const INVITE_KINDS: {
  id:          InviteKind;
  label:       string;
  description: string;
}[] = [
  {
    id:          "friend",
    label:       "Friend / trusted contact",
    description:
      "Someone you trust who joins as your contact. They will not manage children or family settings for you.",
  },
  {
    id:          "family",
    label:       "Family member",
    description:
      "An adult in your family network. You stay connected as their sponsor; this does not give them control over children.",
  },
  {
    id:          "minor",
    label:       "Child or teen",
    description:
      "A young person who joins with Boundaries turned on by default. You must be their parent, guardian, or family steward.",
  },
  {
    id:          "trusted_adult",
    label:       "Trusted adult",
    description:
      "An adult you authorize to support your family (for example a coach or relative). They do not become your family’s account owner.",
  },
  {
    id:          "business",
    label:       "Work / business member",
    description:
      "Work members join a workspace relationship, not a family role. They will not manage family Boundaries or children.",
  },
];

export const STEWARD_DECLARATION_LABEL =
  "Are you this child’s parent, guardian, or family steward?";

export const MINOR_BOUNDARIES_NOTE =
  "Children and teens join with Boundaries turned on by default. You will help guide their trusted spaces and visibility.";

export const BUSINESS_WORKSPACE_NOTE =
  "Work members join a workspace relationship, not a family role.";

export function inviteEmailSubject(kind: InviteKind): string {
  switch (kind) {
    case "friend":
      return "You've been invited to connect on AMIHUMAN.NET";
    case "family":
      return "You've been invited to join our family network";
    case "minor":
      return "You've been invited to join with family Boundaries";
    case "trusted_adult":
      return "You've been invited as a trusted adult";
    case "business":
      return "You've been invited to a work space on AMIHUMAN.NET";
  }
}

export function inviteKindLabel(kind: InviteKind): string {
  return INVITE_KINDS.find((k) => k.id === kind)?.label ?? kind;
}

export function confirmChecklist(kind: InviteKind): string[] {
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
    case "minor":
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

export function previewBodyLine(kind: InviteKind, recipientFirstName?: string): string {
  const hi = recipientFirstName ? `Hi ${recipientFirstName},` : "Hello,";
  switch (kind) {
    case "friend":
      return `${hi} You've been invited to connect as a trusted contact.`;
    case "family":
      return `${hi} You've been invited to join our family network.`;
    case "minor":
      return `${hi} You've been invited to join with family Boundaries.`;
    case "trusted_adult":
      return `${hi} You've been invited as a trusted adult in our network.`;
    case "business":
      return `${hi} You've been invited to a work space on AMIHUMAN.NET.`;
  }
}

/** Map UI kind → API inviteIntent (values unchanged from Agent 73). */
export function inviteIntentForKind(
  kind: InviteKind,
  opts: { relationship: string; minorBracket: "child" | "teen" },
): string {
  switch (kind) {
    case "friend":
      return "adult_friend";
    case "family":
      return "family_adult";
    case "minor":
      return opts.minorBracket === "teen" ? "teen" : "child";
    case "trusted_adult":
      return "trusted_adult";
    case "business":
      return "business_member";
  }
}

export function defaultRelationshipForKind(
  kind: InviteKind,
  relationship: string,
): string {
  if (kind === "friend") return "frnd";
  if (kind === "minor") return "child";
  if (kind === "business" || kind === "trusted_adult") return "other";
  return relationship || "other";
}
