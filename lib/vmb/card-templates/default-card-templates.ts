import { VMB_CARD_TYPES, type VmbCardType } from "@/lib/vmb/cards/card-types";
import type { VmbCardTemplate } from "./card-template-types";
import { VMB_CARD_TEMPLATE_TOKENS } from "./card-template-types";

const BASE_TOKENS = [...VMB_CARD_TEMPLATE_TOKENS];
const NOW = "2026-06-12T00:00:00.000Z";

function seedTemplate(
  type: VmbCardType,
  partial: Omit<VmbCardTemplate, "id" | "type" | "isDefault" | "tokens" | "createdAt" | "updatedAt">,
): VmbCardTemplate {
  return {
    id: `default-${type}`,
    type,
    isDefault: true,
    tokens: BASE_TOKENS,
    createdAt: NOW,
    updatedAt: NOW,
    ...partial,
  };
}

export const DEFAULT_CARD_TEMPLATES: VmbCardTemplate[] = [
  seedTemplate("pcn_invite", {
    name: "Private Client Network Invite",
    description: "Personal invite into your Private Client Network.",
    imageMode: "single",
    accent: "plum",
    tone: "premium",
    greetingTemplate: "Dear {clientName},",
    messageTemplate:
      "I wanted to personally invite you into my Private Client Network at {salonName}. This is where I share first access to openings, client-only offers, and little surprises before they go anywhere else.",
    offerTemplate: "If you want, I can send a few private openings that fit your usual rhythm.",
    primaryCta: "Join Private Client Network",
    secondaryCta: "Book My Next Appointment",
    signatureTemplate: "{ownerName} ❤️",
  }),
  seedTemplate("birthday_card", {
    name: "Birthday Card",
    description: "Warm birthday note for celebration clients.",
    imageMode: "single",
    accent: "rose",
    tone: "playful",
    greetingTemplate: "Dear {clientName},",
    titleTemplate: "Happy Birthday",
    subtitleTemplate: "Wishing you a wonderful year",
    messageTemplate:
      "I hope your birthday feels special. We would love to celebrate you at {salonName} when the moment is right.",
    primaryCta: "Claim Birthday Treat",
    signatureTemplate: "{ownerName}",
  }),
  seedTemplate("reactivation_card", {
    name: "Reactivation Invite",
    description: "Warm reconnect for lapsed or overdue clients.",
    imageMode: "single",
    accent: "plum",
    tone: "warm",
    greetingTemplate: "Dear {clientName},",
    titleTemplate: "We Should Catch Up",
    subtitleTemplate: "It's been too long",
    messageTemplate:
      "It's been a while since we last saw you, and I wanted to reach out personally from {salonName}.",
    primaryCta: "Let's Reconnect",
    signatureTemplate: "{ownerName}",
  }),
  seedTemplate("refresh_card", {
    name: "Refresh Reminder",
    description: "Service refresh reminder for due clients.",
    imageMode: "single",
    accent: "sage",
    tone: "direct",
    greetingTemplate: "Dear {clientName},",
    titleTemplate: "Time For A Refresh?",
    subtitleTemplate: "We'd love to see you again",
    messageTemplate:
      "It has been a little while since your last visit, and I was thinking about you today at {salonName}.",
    primaryCta: "Book Refresh",
    signatureTemplate: "{ownerName}",
  }),
  seedTemplate("vip_thank_you", {
    name: "VIP Thank You",
    description: "Appreciation note for high-value clients.",
    imageMode: "collage",
    accent: "gold",
    tone: "premium",
    greetingTemplate: "Dear {clientName},",
    titleTemplate: "Just Wanted To Say Thanks",
    subtitleTemplate: "You make this place special",
    messageTemplate:
      "Clients like you help make {salonName} feel personal — not just busy. Thank you for trusting us.",
    primaryCta: "See Private Invite",
    signatureTemplate: "{ownerName}",
  }),
  seedTemplate("referral_invite", {
    name: "Referral Invite",
    description: "Invite trusted clients to refer someone they love.",
    imageMode: "single",
    accent: "sage",
    tone: "warm",
    greetingTemplate: "Dear {clientName},",
    titleTemplate: "Bring Someone You Love",
    subtitleTemplate: "Referral invitation",
    messageTemplate:
      "You know the kind of people who belong at {salonName}. I would be grateful if you introduced someone you trust.",
    primaryCta: "Invite A Friend",
    signatureTemplate: "{ownerName}",
  }),
  seedTemplate("open_slot_fill", {
    name: "Open Slot Fill",
    description: "Priority invite for a limited opening.",
    imageMode: "single",
    accent: "rose",
    tone: "direct",
    greetingTemplate: "Dear {clientName},",
    titleTemplate: "A Spot Opened Up",
    subtitleTemplate: "Limited opening",
    messageTemplate:
      "A spot just opened at {salonName}, and I thought of you first before it goes anywhere else.",
    offerTemplate: "If you want it, I can hold {nextOpening} for you.",
    primaryCta: "Claim Opening",
    signatureTemplate: "{ownerName}",
  }),
  seedTemplate("service_card", {
    name: "Service Spotlight",
    description: "Spotlight a service that fits the client.",
    imageMode: "collage",
    accent: "slate",
    tone: "warm",
    greetingTemplate: "Dear {clientName},",
    titleTemplate: "Something New For You",
    subtitleTemplate: "Service spotlight",
    messageTemplate:
      "We thought of you for {serviceName} — something that fits where you are right now at {salonName}.",
    primaryCta: "View Service",
    signatureTemplate: "{ownerName}",
  }),
];

const DEFAULT_BY_TYPE = new Map(DEFAULT_CARD_TEMPLATES.map((template) => [template.type, template]));

export function getDefaultTemplate(type: VmbCardType): VmbCardTemplate {
  const template = DEFAULT_BY_TYPE.get(type);
  if (!template) {
    throw new Error(`Missing default card template for ${type}`);
  }
  return { ...template };
}

export function getAllDefaultTemplates(): VmbCardTemplate[] {
  return VMB_CARD_TYPES.map((type) => getDefaultTemplate(type));
}

export const CARD_TEMPLATE_PREVIEW_CONTEXT = {
  clientName: "Grace",
  ownerName: "Jenny",
  salonName: "Blue Mountain Salon",
  serviceName: "Gel-X",
  lastVisit: "May 12",
  visitCount: 3,
  referralCount: 1,
  offer: "Early access to private openings",
  nextOpening: "Thursday at 2:00 PM",
};
