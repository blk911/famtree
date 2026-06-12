import type { CardAccent, VmbCardType } from "@/lib/vmb/cards/card-types";
import type { CardPreviewModel, CardTemplateInput } from "@/lib/vmb/cards/card-preview-model";

type TemplateCopy = {
  title: string;
  subtitle: string;
  body: string;
  cta: string;
  tags: string[];
  accent: CardAccent;
  imageLayout: "single" | "collage";
};

const COPY: Record<VmbCardType, TemplateCopy> = {
  refresh_card: {
    title: "A Little Refresh?",
    subtitle: "We'd love to see you again",
    body: "It's been a while since we last saw you and I was thinking about you today.",
    cta: "Book your refresh",
    tags: ["Refresh", "Personal"],
    accent: "sage",
    imageLayout: "single",
  },
  vip_thank_you: {
    title: "Just Wanted To Say Thanks",
    subtitle: "You make this place special",
    body: "Clients like you help make this place special.",
    cta: "Book with us",
    tags: ["VIP", "Appreciation"],
    accent: "gold",
    imageLayout: "collage",
  },
  reactivation_card: {
    title: "We Should Catch Up",
    subtitle: "It's been too long",
    body: "It's been a while and I thought I'd say hello.",
    cta: "Let's reconnect",
    tags: ["Reactivation", "Personal"],
    accent: "plum",
    imageLayout: "single",
  },
  birthday_card: {
    title: "Happy Birthday",
    subtitle: "Wishing you a wonderful year",
    body: "Wishing you a wonderful birthday and year ahead.",
    cta: "Celebrate with us",
    tags: ["Birthday", "Celebration"],
    accent: "rose",
    imageLayout: "single",
  },
  pcn_invite: {
    title: "You're Invited",
    subtitle: "Private Client Network",
    body: "I'd love to invite you into our inner circle — early access, thoughtful perks, and a salon experience that feels personal.",
    cta: "Join the network",
    tags: ["PCN", "Invite"],
    accent: "plum",
    imageLayout: "collage",
  },
  referral_invite: {
    title: "Know Someone We'd Love?",
    subtitle: "Referral invitation",
    body: "You know the kind of people who belong here. I'd be grateful if you'd introduce someone you trust.",
    cta: "Send a referral",
    tags: ["Referral", "Invite"],
    accent: "sage",
    imageLayout: "single",
  },
  open_slot_fill: {
    title: "An Opening Just For You",
    subtitle: "Priority invite",
    body: "We have a spot that felt like it might be perfect for you — short notice, but I'd love to save it if you're free.",
    cta: "Claim this spot",
    tags: ["Open slot", "Priority"],
    accent: "rose",
    imageLayout: "single",
  },
  service_card: {
    title: "Something New For You",
    subtitle: "Service spotlight",
    body: "We picked something from your history that might be exactly what you need next.",
    cta: "View service",
    tags: ["Service", "Spotlight"],
    accent: "slate",
    imageLayout: "collage",
  },
};

function firstName(name?: string): string {
  const trimmed = name?.trim();
  if (!trimmed) return "Friend";
  const first = trimmed.split(/\s+/)[0];
  if (first.includes("&") || first.toLowerCase() === "your") return trimmed;
  return first;
}

function buildSalutation(recipientName?: string): string {
  const name = firstName(recipientName);
  return name === "Friend" ? "Dear friend," : `Dear ${name},`;
}

function personalizeBody(template: TemplateCopy, input: CardTemplateInput): string {
  const name = firstName(input.recipientName);
  if (input.cardType === "refresh_card" && input.lastVisit) {
    return `It's been a while since your last visit (${input.lastVisit}) and I was thinking about you today.`;
  }
  if (input.cardType === "birthday_card" && input.birthday) {
    return `Wishing you a wonderful birthday on ${input.birthday} and a beautiful year ahead.`;
  }
  if (input.cardType === "referral_invite" && input.referralCount && input.referralCount > 0) {
    return `You've brought ${input.referralCount} trusted friend${input.referralCount === 1 ? "" : "s"} our way — thank you. Know someone else we'd love?`;
  }
  if (input.cardType === "service_card" && input.serviceName) {
    return `We thought of you for ${input.serviceName} — something that fits where you are right now.`;
  }
  if (input.cardType === "vip_thank_you" && input.ticketValue) {
    return `Clients like you help make this place special. Your trust means more than you know.`;
  }
  if (name !== "Friend" && template.body.startsWith("It's been")) {
    return template.body.replace("you", name);
  }
  return template.body;
}

function buildImageSlots(layout: "single" | "collage"): CardPreviewModel["imageSlots"] {
  if (layout === "single") {
    return [{ id: "hero", label: "Hero image" }];
  }
  return [
    { id: "collage-1", label: "Salon moment" },
    { id: "collage-2", label: "Detail" },
    { id: "collage-3", label: "Style" },
  ];
}

export function buildCardPreview(input: CardTemplateInput): CardPreviewModel {
  const template = COPY[input.cardType];
  const recipientName = input.recipientName?.trim() || undefined;

  return {
    cardType: input.cardType,
    salutation: buildSalutation(recipientName),
    title: template.title,
    subtitle: template.subtitle,
    body: personalizeBody(template, input),
    imageLayout: template.imageLayout,
    imageSlots: buildImageSlots(template.imageLayout),
    accent: template.accent,
    cta: template.cta,
    tags: template.tags,
    metadata: {
      recipientName,
      serviceName: input.serviceName,
      lastVisit: input.lastVisit,
      birthday: input.birthday,
      referralCount: input.referralCount,
      ticketValue: input.ticketValue,
    },
  };
}
