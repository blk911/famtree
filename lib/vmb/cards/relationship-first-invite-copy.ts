import type { VmbCardType } from "@/lib/vmb/cards/card-types";
import type { InviteDraftCategory } from "@/types/vmb/invite-draft";

/** Canonical relationship-first invite card ids — 10 salon-owner voice presets. */
export const RELATIONSHIP_FIRST_CARD_IDS = [
  "new_client_welcome",
  "first_visit_thank_you",
  "private_client_network",
  "refresh_reminder",
  "we_miss_you",
  "open_chair",
  "referral_invite",
  "vip_thank_you",
  "birthday_celebration",
  "favorite_providers",
] as const;

export type RelationshipFirstCardId = (typeof RELATIONSHIP_FIRST_CARD_IDS)[number];

export type RelationshipFirstCardCopy = {
  id: RelationshipFirstCardId;
  label: string;
  greetingTemplate: string;
  messageTemplate: string;
  relationshipBenefitTemplate: string;
  offerTemplate?: string;
  signatureTemplate: string;
  primaryCta: string;
  titleTemplate?: string;
  subtitleTemplate?: string;
};

const SIGNATURE = "{ownerName} 💕";

export const RELATIONSHIP_FIRST_INVITE_CARDS: RelationshipFirstCardCopy[] = [
  {
    id: "new_client_welcome",
    label: "New Client Welcome",
    greetingTemplate: "Dear {clientName},",
    messageTemplate:
      "I'm so glad you're here. Starting with a new salon should feel personal — like a real conversation, not a form on a screen.",
    relationshipBenefitTemplate:
      "I'd love to learn what you're hoping for, answer your questions, and help you feel at home from your very first visit.",
    offerTemplate: "Whenever you're ready, reply and we'll find a time that works for you.",
    signatureTemplate: SIGNATURE,
    primaryCta: "Welcome to the salon",
  },
  {
    id: "first_visit_thank_you",
    label: "First Visit Thank You",
    greetingTemplate: "Dear {clientName},",
    messageTemplate:
      "Thank you for trusting me with your first visit. That first appointment matters — and I don't take it lightly.",
    relationshipBenefitTemplate:
      "I hope you felt seen, comfortable, and cared for. That's the experience I want every time you sit in my chair.",
    offerTemplate: "If anything felt unclear or you'd like to book again, just reply — I'm here.",
    signatureTemplate: SIGNATURE,
    primaryCta: "Book my next visit",
  },
  {
    id: "private_client_network",
    label: "Private Client Network",
    greetingTemplate: "Dear {clientName},",
    messageTemplate:
      "I think about the clients who make this work meaningful — and you're one of them. Your {serviceName} visits always feel easy, unhurried, and real.",
    relationshipBenefitTemplate:
      "I'm building a Private Client Network for people I genuinely want to keep close — first access to openings, quiet offers, and care that never gets posted publicly.",
    offerTemplate:
      "If you'd like in, I can send a few private openings that fit your rhythm before anyone else sees them.",
    signatureTemplate: SIGNATURE,
    primaryCta: "Join My Private Client Network",
  },
  {
    id: "refresh_reminder",
    label: "Refresh Reminder",
    greetingTemplate: "Dear {clientName},",
    messageTemplate:
      "I've been thinking about you and your last {serviceName} visit — it feels like the right time for a refresh.",
    relationshipBenefitTemplate:
      "Staying on your rhythm keeps your look feeling like you, not like you're catching up after the fact.",
    offerTemplate: "If you want, I can hold a couple of times before they go on the books publicly.",
    signatureTemplate: SIGNATURE,
    primaryCta: "Book My Refresh",
    titleTemplate: "Time for a refresh?",
    subtitleTemplate: "Your usual rhythm",
  },
  {
    id: "we_miss_you",
    label: "We Miss You",
    greetingTemplate: "Dear {clientName},",
    messageTemplate:
      "It's been a while since I've seen you — and I mean that honestly, not as a reminder from a computer.",
    relationshipBenefitTemplate:
      "Your chair still matters here. When you're ready, I would love to pick back up right where we left off.",
    offerTemplate: "If {lastVisit} feels like a distant memory, reply and we'll find something that works.",
    signatureTemplate: SIGNATURE,
    primaryCta: "Let's Catch Up",
    titleTemplate: "We should catch up",
    subtitleTemplate: "It's been too long",
  },
  {
    id: "open_chair",
    label: "Opening Just Became Available",
    greetingTemplate: "Dear {clientName},",
    messageTemplate: "Something just opened up — and you were the first person I thought of.",
    relationshipBenefitTemplate:
      "Before I offer it anywhere else, I wanted to give you first right of refusal.",
    offerTemplate: "If you'd like it, I can hold {nextOpening} for you.",
    signatureTemplate: SIGNATURE,
    primaryCta: "Hold This Opening For Me",
    titleTemplate: "A spot opened up",
    subtitleTemplate: "First access for you",
  },
  {
    id: "referral_invite",
    label: "Referral Invite",
    greetingTemplate: "Dear {clientName},",
    messageTemplate:
      "My relationship with you is the reason I get to do what I love every day.\n\nOver the years we've shared conversations, stories, life updates, laughs, and a lot of appointments. Clients like you aren't appointments on a calendar — you're part of the reason this salon exists.\n\nIf there's someone in your life you'd love to share that experience with, I'd be honored to take care of them too.\n\nA friend. A sister. A daughter. A coworker. Someone special.\n\nAnd as a thank you, I have something waiting for both of you.",
    relationshipBenefitTemplate:
      "The people we trust often introduce us to the people we'll trust next.",
    offerTemplate: "Share someone important to you and I'll make sure they feel right at home.",
    signatureTemplate: SIGNATURE,
    primaryCta: "Invite Someone You Care About",
    titleTemplate: "Someone you love",
    subtitleTemplate: "A personal invitation",
  },
  {
    id: "vip_thank_you",
    label: "VIP Thank You",
    greetingTemplate: "Dear {clientName},",
    messageTemplate:
      "I wanted to say thank you — not as a campaign, just as me.",
    relationshipBenefitTemplate:
      "You are part of why {salonName} feels like a home and not a hustle.",
    offerTemplate: "When you're ready, I have a small thank-you waiting for you.",
    signatureTemplate: SIGNATURE,
    primaryCta: "See Your Thank You",
    titleTemplate: "Just wanted to say thanks",
    subtitleTemplate: "From my chair to you",
  },
  {
    id: "birthday_celebration",
    label: "Birthday Celebration",
    greetingTemplate: "Dear {clientName},",
    messageTemplate:
      "Your birthday is coming up, and I wanted to reach out the way I would to someone I actually know.",
    relationshipBenefitTemplate:
      "You deserve a moment that feels celebrated — not mass-marketed.",
    offerTemplate: "I'd love to help you celebrate with something special this month.",
    signatureTemplate: SIGNATURE,
    primaryCta: "Claim Birthday Treat",
    titleTemplate: "Happy birthday",
    subtitleTemplate: "Celebrating you",
  },
  {
    id: "favorite_providers",
    label: "Favorite Providers / Salon Referral",
    greetingTemplate: "Dear {clientName},",
    messageTemplate:
      "There's a {serviceName} I think you'd genuinely love — not because it's trendy, but because it fits you.",
    relationshipBenefitTemplate:
      "When the timing is right, I'd love to walk you through it personally at {salonName}.",
    offerTemplate: "Reply if you're curious — happy to answer questions before you book.",
    signatureTemplate: SIGNATURE,
    primaryCta: "Tell Me More",
    titleTemplate: "Thought of you",
    subtitleTemplate: "A service that fits",
  },
];

const CARD_BY_ID = new Map(RELATIONSHIP_FIRST_INVITE_CARDS.map((card) => [card.id, card]));

const TEMPLATE_TYPE_TO_CARD_ID: Record<VmbCardType, RelationshipFirstCardId> = {
  pcn_invite: "private_client_network",
  refresh_card: "refresh_reminder",
  reactivation_card: "we_miss_you",
  open_slot_fill: "open_chair",
  referral_invite: "referral_invite",
  vip_thank_you: "vip_thank_you",
  birthday_card: "birthday_celebration",
  service_card: "favorite_providers",
};

const OUTREACH_CATEGORY_TO_CARD_ID: Partial<Record<InviteDraftCategory, RelationshipFirstCardId>> = {
  private_client_network: "private_client_network",
  new_client_welcome: "new_client_welcome",
  revenue_touch: "first_visit_thank_you",
  trusted_intro_request: "referral_invite",
};

export function getRelationshipFirstCard(id: RelationshipFirstCardId): RelationshipFirstCardCopy {
  const card = CARD_BY_ID.get(id);
  if (!card) {
    throw new Error(`Missing relationship-first card copy for ${id}`);
  }
  return { ...card };
}

export function listRelationshipFirstInviteCards(): RelationshipFirstCardCopy[] {
  return RELATIONSHIP_FIRST_INVITE_CARDS.map((card) => ({ ...card }));
}

export function getRelationshipFirstCardForTemplateType(type: VmbCardType): RelationshipFirstCardCopy {
  return getRelationshipFirstCard(TEMPLATE_TYPE_TO_CARD_ID[type]);
}

export function getRelationshipFirstCardForOutreachCategory(
  category: InviteDraftCategory,
): RelationshipFirstCardCopy | undefined {
  const id = OUTREACH_CATEGORY_TO_CARD_ID[category];
  return id ? getRelationshipFirstCard(id) : undefined;
}

/** Outreach body — relationship-first, no SaaS footer in editable region. */
export function buildRelationshipFirstOutreachMessage(
  card: RelationshipFirstCardCopy,
  vars: { firstName?: string; salonName?: string; welcomeMessage?: string; reason?: string; suggestedAction?: string; promptText?: string },
): string {
  const firstName = vars.firstName?.trim() || "there";
  const salonName = vars.salonName?.trim() || "Your Salon";

  if (card.id === "new_client_welcome" && vars.welcomeMessage?.trim()) {
    return vars.welcomeMessage.trim();
  }

  if (card.id === "first_visit_thank_you" && vars.reason?.trim()) {
    return [
      `Hi ${firstName},`,
      "",
      card.messageTemplate.replace("{clientName}", firstName),
      "",
      vars.reason.trim(),
      vars.suggestedAction?.trim() ? `\n${vars.suggestedAction.trim()}` : "",
      "",
      `— ${salonName}`,
    ]
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  if (card.id === "referral_invite" && vars.promptText?.trim()) {
    return [
      `Hi ${firstName},`,
      "",
      vars.promptText.trim(),
      "",
      card.offerTemplate ?? "",
    ]
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  return [
    card.greetingTemplate.replace("{clientName}", firstName),
    "",
    card.messageTemplate.replace("{clientName}", firstName).replace("{salonName}", salonName),
    "",
    card.relationshipBenefitTemplate.replace("{clientName}", firstName).replace("{salonName}", salonName),
    card.offerTemplate ? `\n${card.offerTemplate.replace("{clientName}", firstName).replace("{salonName}", salonName)}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function buildRelationshipFirstOutreachSubject(
  card: RelationshipFirstCardCopy,
  vars: { salonName?: string; firstName?: string },
): string {
  const salonName = vars.salonName?.trim() || "Your Salon";
  switch (card.id) {
    case "new_client_welcome":
      return `Welcome to ${salonName}`;
    case "first_visit_thank_you":
      return `Thank you for your first visit — ${salonName}`;
    case "private_client_network":
      return `A personal invite from ${salonName}`;
    case "referral_invite":
      return `Someone you care about — ${salonName}`;
    default:
      return `${card.label} — ${salonName}`;
  }
}

/** PCN preview fallback when template copy is not yet loaded. */
export function buildRelationshipFirstPersonalInviteFallback(input: {
  recipientName?: string;
  techName?: string;
}): {
  greeting: string;
  personalConnection: string;
  inviteMessage: string;
  offerMessage: string;
  signature: string;
  primaryCta: string;
  secondaryCta: string;
} {
  const card = getRelationshipFirstCard("private_client_network");
  const firstName = input.recipientName?.trim().split(/\s+/)[0] || "friend";
  const greeting = firstName === "friend" ? "Dear friend," : `Dear ${firstName},`;
  const owner = input.techName?.trim() || "{ownerName}";

  return {
    greeting,
    personalConnection: card.messageTemplate.replace("{serviceName}", "favorite"),
    inviteMessage: card.relationshipBenefitTemplate,
    offerMessage: card.offerTemplate ?? "",
    signature: card.signatureTemplate.replace("{ownerName}", owner),
    primaryCta: card.primaryCta,
    secondaryCta: "Book My Next Appointment",
  };
}

/** Stale referral phrases that must not appear outside the new referral personal note. */
export const STALE_REFERRAL_COPY_MARKERS = [
  "You know the kind of people who belong at",
  "I would be grateful if you introduced someone you trust",
  "Bring Someone You Love",
] as const;

/** Canonical preset source paths for admin/product wiring tests. */
export const VMB_INVITE_PRESET_SOURCE_MODULES = {
  relationshipFirstCards: "lib/vmb/cards/relationship-first-invite-copy.ts",
  outreachMessages: "lib/vmb/invites/outreach-message-presets.ts",
  outreachPresetStore: "lib/vmb/invites/outreach-preset-store.ts",
  cardTemplates: "lib/vmb/card-templates/default-card-templates.ts",
  ctaLabels: "lib/vmb/card-templates/template-cta-labels.ts",
  personalInviteCopy: "lib/vmb/cards/personal-invite-copy.ts",
  defaultOffers: "lib/vmb/offers/default-offers.ts",
  defaultServices: "lib/vmb/services/default-service-catalog.ts",
} as const;
