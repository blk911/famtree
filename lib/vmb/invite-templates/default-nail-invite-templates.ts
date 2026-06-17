import type { VmbInviteTemplate } from "./invite-template-types";

const NOW = "2026-01-01T00:00:00.000Z";

function template(
  inviteType: VmbInviteTemplate["inviteType"],
  fields: Omit<
    VmbInviteTemplate,
    "id" | "categoryId" | "inviteType" | "createdAt" | "updatedAt" | "active" | "sortOrder"
  > & { sortOrder: number },
): VmbInviteTemplate {
  const slug = inviteType.replace(/_/g, "-");
  return {
    id: `nails-${slug}`,
    categoryId: "nails",
    inviteType,
    active: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...fields,
  };
}

export const DEFAULT_NAIL_INVITE_TEMPLATES: VmbInviteTemplate[] = [
  template("private_client_network", {
    displayName: "Private Client Network",
    intent: "Invite a trusted client into the salon's private client network.",
    subject: "You're invited to {salonName}'s private client network",
    eyebrow: "Private Client Network",
    headline: "You're on my private client list",
    body: "Hi {clientName}, I'm inviting a small group of clients into my private client network so I can share first access, special offers, and appointment openings directly with the people I know and trust. I'd love for you to be part of it.",
    ctaLabel: "Join My Private Client Network",
    defaultOfferCategory: "pcn",
    allowedOfferCategories: ["pcn", "vip", "self_care"],
    sortOrder: 1,
  }),
  template("birthday_celebration", {
    displayName: "Birthday Celebration",
    intent: "Celebrate the client and attach a birthday-ready nail offer.",
    subject: "A birthday nail treat from {salonName}",
    eyebrow: "Birthday Celebration",
    headline: "A little birthday sparkle for you",
    body: "Happy Birthday {clientName}! I put together something special so you can celebrate with a fresh set, a little shine, and a reason to feel extra cared for this month.",
    ctaLabel: "View My Birthday Offer",
    defaultOfferCategory: "birthday",
    allowedOfferCategories: ["birthday", "seasonal", "self_care"],
    sortOrder: 2,
  }),
  template("referral_invite", {
    displayName: "Referral Invite",
    intent: "Invite a trusted client to bring someone they care about.",
    subject: "Invite someone you care about",
    eyebrow: "Referral Invite",
    headline: "Know someone who would love this?",
    body: "Hi {clientName}, some of my best clients come through people I already trust. If you have a friend who would love a fresh nail set or a little self-care time, I'd be honored to welcome them.",
    ctaLabel: "Invite Someone You Care About",
    defaultOfferCategory: "referral",
    allowedOfferCategories: ["referral", "new_client", "pcn"],
    sortOrder: 3,
  }),
  template("open_chair", {
    displayName: "Open Chair",
    intent: "Fill an available appointment slot quickly.",
    subject: "I had a nail opening come available",
    eyebrow: "Open Chair",
    headline: "I saved an opening for you",
    body: "Hi {clientName}, I had an appointment open up and thought of you first. If you've been meaning to get refreshed, this is a good chance to grab the spot before it's gone.",
    ctaLabel: "Claim This Opening",
    defaultOfferCategory: "open_chair",
    allowedOfferCategories: ["open_chair", "refresh", "self_care"],
    sortOrder: 4,
  }),
  template("refresh_reminder", {
    displayName: "Refresh Reminder",
    intent: "Prompt a maintenance/refill/refresh appointment.",
    subject: "Ready for a refresh?",
    eyebrow: "Refresh Reminder",
    headline: "Your nails may be ready for a refresh",
    body: "Hi {clientName}, it may be time for a fresh shape, clean cuticle work, and a new finish. I saved a refresh option so you can keep your nails looking cared for without waiting too long.",
    ctaLabel: "Book My Refresh",
    defaultOfferCategory: "refresh",
    allowedOfferCategories: ["refresh", "self_care", "seasonal"],
    sortOrder: 5,
  }),
  template("we_miss_you", {
    displayName: "We Miss You",
    intent: "Reactivate a client who has not visited recently.",
    subject: "We miss seeing you at {salonName}",
    eyebrow: "We Miss You",
    headline: "It's been too long",
    body: "Hi {clientName}, I haven't seen you in a while and wanted to personally invite you back. I put together a simple way to come in, reset, and leave with a fresh set you feel good about.",
    ctaLabel: "Come Back In",
    defaultOfferCategory: "self_care",
    allowedOfferCategories: ["self_care", "refresh", "seasonal", "vip"],
    sortOrder: 6,
  }),
  template("vip_thank_you", {
    displayName: "VIP Thank You",
    intent: "Recognize a high-value loyal client.",
    subject: "A thank-you from {salonName}",
    eyebrow: "VIP Thank You",
    headline: "You're one of the clients I truly appreciate",
    body: "Hi {clientName}, I wanted to send a small thank-you for being part of my business. Loyal clients make everything possible, and I wanted you to have first access to something special.",
    ctaLabel: "View My Thank-You Offer",
    defaultOfferCategory: "vip",
    allowedOfferCategories: ["vip", "pcn", "birthday", "seasonal"],
    sortOrder: 7,
  }),
  template("favorite_providers", {
    displayName: "Favorite Providers",
    intent: "Introduce trusted providers or cross-service network value.",
    subject: "A few trusted favorites for you",
    eyebrow: "Favorite Providers",
    headline: "Trusted favorites, shared personally",
    body: "Hi {clientName}, I'm building a small trusted network of providers and clients. When I share someone with you, it's because I'd feel good sending you there myself.",
    ctaLabel: "See My Trusted Favorites",
    defaultOfferCategory: "pcn",
    allowedOfferCategories: ["pcn", "referral", "new_client"],
    sortOrder: 8,
  }),
  template("first_visit_thank_you", {
    displayName: "First Visit Thank You",
    intent: "Thank a new client after first service and encourage second booking.",
    subject: "Thank you for your first visit",
    eyebrow: "First Visit Thank You",
    headline: "I loved having you in",
    body: "Hi {clientName}, thank you for coming in. I hope you loved your nails and felt taken care of. I saved a simple next-step offer so your next visit is easy when you're ready.",
    ctaLabel: "Plan My Next Visit",
    defaultOfferCategory: "new_client",
    allowedOfferCategories: ["new_client", "refresh", "self_care"],
    sortOrder: 9,
  }),
  template("new_client_welcome", {
    displayName: "New Client Welcome",
    intent: "Welcome a new prospective client into the salon experience.",
    subject: "Welcome to {salonName}",
    eyebrow: "New Client Welcome",
    headline: "Your first nail visit starts here",
    body: "Hi {clientName}, welcome. I'd love to help you find the right service, whether you want a clean gel manicure, a structured set, or something more expressive. Here's a simple way to start.",
    ctaLabel: "Choose My First Offer",
    defaultOfferCategory: "new_client",
    allowedOfferCategories: ["new_client", "seasonal", "self_care", "birthday"],
    sortOrder: 10,
  }),
];

export function getDefaultNailInviteTemplate(id: string): VmbInviteTemplate | undefined {
  return DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === id);
}

export function listDefaultInviteTemplatesForCategory(
  categoryId: string,
): VmbInviteTemplate[] {
  if (categoryId === "nails") {
    return DEFAULT_NAIL_INVITE_TEMPLATES.map((row) => ({ ...row }));
  }
  return [];
}
