import type { VmbCardType } from "@/lib/vmb/cards/card-types";
import type { InviteDraftCategory } from "@/types/vmb/invite-draft";

/** Canonical relationship-first invite card ids — numbered 1–10 salon-owner voice presets. */
export const RELATIONSHIP_FIRST_CARD_IDS = [
  "private_client_network",
  "refresh_reminder",
  "we_miss_you",
  "open_chair",
  "referral_invite",
  "vip_thank_you",
  "birthday_celebration",
  "new_client_welcome",
  "first_visit_thank_you",
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
    id: "private_client_network",
    label: "Private Client Network",
    greetingTemplate: "Dear {clientName},",
    messageTemplate: "I want to invite you into my Private Client Network.",
    relationshipBenefitTemplate:
      "It's the easiest way to stay connected with me, get first access to your favorite appointment times, receive special client-only offers, surprise gifts, and invitations to events before they're announced publicly.\n\nIt's also where I share referral rewards and little thank-you surprises for the people who support my business.\n\nI'd love to have you there.",
    signatureTemplate: SIGNATURE,
    primaryCta: "Join My Private Client Network",
  },
  {
    id: "refresh_reminder",
    label: "Refresh Reminder",
    greetingTemplate: "Dear {clientName},",
    messageTemplate:
      "I was looking at my calendar and realized it's been since {lastAppointmentDate} since I've seen you.\n\nI have a few openings coming up that would be perfect for your usual {serviceName} appointment before they get booked.",
    relationshipBenefitTemplate: "If one works for you, I'd love to see you back in my chair.",
    signatureTemplate: SIGNATURE,
    primaryCta: "Book My Usual Appointment",
    titleTemplate: "Time for your usual visit",
    subtitleTemplate: "Openings before they fill",
  },
  {
    id: "we_miss_you",
    label: "We Miss You",
    greetingTemplate: "Dear {clientName},",
    messageTemplate:
      "It's been a while since our last visit and I wanted to check in.\n\nLife gets busy, schedules get packed, and before you know it months have passed.",
    relationshipBenefitTemplate:
      "I miss seeing you and would love the chance to catch up. I have a few openings available if you're ready for some time for yourself.",
    signatureTemplate: SIGNATURE,
    primaryCta: "Let's Catch Up",
    titleTemplate: "Checking in",
    subtitleTemplate: "When you're ready",
  },
  {
    id: "open_chair",
    label: "Opening Just Became Available",
    greetingTemplate: "Dear {clientName},",
    messageTemplate:
      "A cancellation just opened a spot on my calendar and I immediately thought of you.\n\nBefore I release it publicly, I wanted to offer it to a few favorite clients first.",
    relationshipBenefitTemplate:
      "If you'd like it, I can reserve it for your usual {serviceName} appointment.",
    signatureTemplate: SIGNATURE,
    primaryCta: "Claim This Opening",
    titleTemplate: "An opening for you",
    subtitleTemplate: "Before it goes public",
  },
  {
    id: "referral_invite",
    label: "Referral Invite",
    greetingTemplate: "Dear {clientName},",
    messageTemplate:
      "We've built a great relationship over the years, and clients like you are the reason I get to do what I love.\n\nIf you have a friend, sister, daughter, coworker, or someone special who would enjoy the same experience you've had here, I'd love the opportunity to take care of them too.",
    relationshipBenefitTemplate: "As a thank you, I have something special waiting for both of you.",
    signatureTemplate: SIGNATURE,
    primaryCta: "Invite Someone You Love",
    titleTemplate: "Someone special",
    subtitleTemplate: "A personal invitation",
  },
  {
    id: "vip_thank_you",
    label: "VIP Thank You",
    greetingTemplate: "Dear {clientName},",
    messageTemplate:
      "I wanted to personally thank you.\n\nYour trust, loyalty, referrals, and support have helped me build the business I dreamed about.\n\nEvery appointment, every recommendation, and every friend you've sent my way has mattered.",
    relationshipBenefitTemplate:
      "I put together a little VIP surprise just for you because clients like you are the foundation of my success.",
    signatureTemplate: SIGNATURE,
    primaryCta: "Enjoy Your VIP Gift",
    titleTemplate: "Thank you",
    subtitleTemplate: "From my chair to you",
  },
  {
    id: "birthday_celebration",
    label: "Birthday",
    greetingTemplate: "Dear {clientName},",
    messageTemplate:
      "Happy Birthday!\n\nI hope your day is filled with people you love, great memories, and a little time to spoil yourself.",
    relationshipBenefitTemplate:
      "I wanted to celebrate with you and send a small birthday surprise your way.",
    signatureTemplate: SIGNATURE,
    primaryCta: "Enjoy Your Birthday Gift",
    titleTemplate: "Happy Birthday",
    subtitleTemplate: "Celebrating you",
  },
  {
    id: "new_client_welcome",
    label: "New Client Welcome",
    greetingTemplate: "Dear {clientName},",
    messageTemplate:
      "Thank you for booking with me.\n\nI know there are a lot of choices, and I'm honored you've trusted me with your upcoming appointment.",
    relationshipBenefitTemplate:
      "My goal is simple: I want you to leave feeling beautiful, confident, and excited to come back.\n\nI can't wait to meet you.",
    signatureTemplate: SIGNATURE,
    primaryCta: "See Appointment Details",
  },
  {
    id: "first_visit_thank_you",
    label: "First Visit Thank You",
    greetingTemplate: "Dear {clientName},",
    messageTemplate:
      "Thank you for spending part of your day with me.\n\nI loved meeting you and having the opportunity to work with you.",
    relationshipBenefitTemplate:
      "I'd love to stay connected, share future openings, special offers, and a few surprises along the way.",
    signatureTemplate: SIGNATURE,
    primaryCta: "Stay Connected",
  },
  {
    id: "favorite_providers",
    label: "Favorite Providers",
    greetingTemplate: "Dear {clientName},",
    messageTemplate:
      "One of my favorite things about this business is connecting great people with great professionals.",
    relationshipBenefitTemplate:
      "Whether it's nails, hair, lashes, skin care, massage, or something else, I'd love to know who your favorite providers are.\n\nI'm always looking for amazing people to introduce my clients to.",
    signatureTemplate: SIGNATURE,
    primaryCta: "Share Your Favorites",
    titleTemplate: "Your favorites",
    subtitleTemplate: "Great people to know",
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

export function firstNameFromRecipient(name?: string): string {
  const trimmed = name?.trim();
  if (!trimmed) return "friend";
  return trimmed.split(/\s+/)[0] || trimmed;
}

export type RelationshipFirstInviteVars = {
  clientName?: string;
  ownerName?: string;
  salonName?: string;
  serviceName?: string;
  lastVisit?: string;
  lastAppointmentDate?: string;
  styleName?: string;
  preferredDay?: string;
  preferredTime?: string;
  nextOpening?: string;
};

function applyRelationshipFirstTokens(text: string, vars: RelationshipFirstInviteVars): string {
  const clientName = firstNameFromRecipient(vars.clientName);
  const lastAppointmentDate = vars.lastAppointmentDate?.trim() || vars.lastVisit?.trim() || "";
  const serviceName = vars.serviceName?.trim() || "";
  const replacements: Record<string, string> = {
    "{clientName}": clientName,
    "{ownerName}": vars.ownerName?.trim() || "Your stylist",
    "{salonName}": vars.salonName?.trim() || "Your Salon",
    "{serviceName}": serviceName,
    "{lastVisit}": lastAppointmentDate,
    "{lastAppointmentDate}": lastAppointmentDate,
    "{styleName}": vars.styleName?.trim() || serviceName,
    "{preferredDay}": vars.preferredDay?.trim() || "",
    "{preferredTime}": vars.preferredTime?.trim() || "",
    "{nextOpening}": vars.nextOpening?.trim() || "",
  };

  let result = text;
  for (const [token, value] of Object.entries(replacements)) {
    result = result.split(token).join(value);
  }
  return result;
}

/** Full invite body — greeting, message, relationship benefit, signature. */
export function assembleRelationshipFirstInviteMessage(
  card: RelationshipFirstCardCopy,
  vars: RelationshipFirstInviteVars = {},
): string {
  const greeting = applyRelationshipFirstTokens(card.greetingTemplate, vars);
  const message = applyRelationshipFirstTokens(card.messageTemplate, vars);
  const benefit = applyRelationshipFirstTokens(card.relationshipBenefitTemplate, vars);
  const signature = applyRelationshipFirstTokens(card.signatureTemplate, vars);

  return [greeting, message, benefit, signature].filter(Boolean).join("\n\n").trim();
}

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
  vars: {
    firstName?: string;
    salonName?: string;
    clientName?: string;
    ownerName?: string;
    welcomeMessage?: string;
    serviceName?: string;
    lastVisit?: string;
  },
): string {
  if (card.id === "new_client_welcome" && vars.welcomeMessage?.trim()) {
    return vars.welcomeMessage.trim();
  }

  return assembleRelationshipFirstInviteMessage(card, {
    clientName: vars.clientName ?? vars.firstName,
    ownerName: vars.ownerName,
    salonName: vars.salonName,
    serviceName: vars.serviceName,
    lastVisit: vars.lastVisit,
    lastAppointmentDate: vars.lastVisit,
  });
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
  const firstName = firstNameFromRecipient(input.recipientName);
  const greeting = firstName === "friend" ? "Dear friend," : `Dear ${firstName},`;
  const owner = input.techName?.trim() || "{ownerName}";

  return {
    greeting,
    personalConnection: card.messageTemplate,
    inviteMessage: card.relationshipBenefitTemplate,
    offerMessage: card.offerTemplate ?? "",
    signature: card.signatureTemplate.replace("{ownerName}", owner),
    primaryCta: card.primaryCta,
    secondaryCta: "Book My Next Appointment",
  };
}

/** Stale referral phrases from prior template generations. */
export const STALE_REFERRAL_COPY_MARKERS = [
  "You know the kind of people who belong at",
  "I would be grateful if you introduced someone you trust",
  "My relationship with you is the reason I get to do what I love",
  "Invite Someone You Care About",
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
