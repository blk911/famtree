import type { VmbOffer, VmbOfferCategory } from "./offer-types";
import { VMB_OFFER_CATEGORIES } from "./offer-types";
import {
  DEMO_BIRTHDAY_OFFER_OPTION_IDS,
  DEMO_BIRTHDAY_OFFER_SERVICE_IDS,
} from "@/lib/vmb/services/default-service-catalog";
const NOW = "2026-06-12T00:00:00.000Z";

function seedOffer(
  category: VmbOfferCategory,
  partial: Omit<VmbOffer, "id" | "category" | "isDefault" | "active" | "source" | "createdAt" | "updatedAt">,
): VmbOffer {
  return {
    id: `default-${category}`,
    category,
    isDefault: true,
    active: true,
    source: "default",
    createdAt: NOW,
    updatedAt: NOW,
    ...partial,
  };
}

export const DEFAULT_OFFERS: VmbOffer[] = [
  seedOffer("new_client", {
    name: "New Client Welcome",
    description: "First-time guest welcome offer.",
    valueLabel: "Welcome offer",
    offerText: "A first-time guest welcome offer is waiting for you.",
  }),
  seedOffer("birthday", {
    name: "Birthday Treat",
    description: "Birthday celebration offer.",
    valueLabel: "Complimentary Chrome Upgrade",
    offerText: "Book this month to enjoy a complimentary chrome upgrade on your visit.",
    serviceIds: [...DEMO_BIRTHDAY_OFFER_SERVICE_IDS],
    serviceOptionIds: [...DEMO_BIRTHDAY_OFFER_OPTION_IDS],
  }),
  seedOffer("pcn", {
    name: "PCN Early Access",
    description: "Private Client Network early access perk.",
    valueLabel: "Private access",
    offerText: "Get first access to private openings and client-only notes.",
  }),
  seedOffer("vip", {
    name: "VIP Thank You",
    description: "VIP client appreciation offer.",
    valueLabel: "Client appreciation",
    offerText: "A private thank-you is waiting for you.",
  }),
  seedOffer("referral", {
    name: "Referral Thank You",
    description: "Referral reward offer.",
    valueLabel: "Referral reward",
    offerText: "Bring someone you love and enjoy a thank-you from the salon.",
  }),
  seedOffer("refresh", {
    name: "Refresh Add-On",
    description: "Refresh visit add-on offer.",
    valueLabel: "Complimentary add-on",
    offerText: "Book your refresh and enjoy a little extra touch on your visit.",
  }),
  seedOffer("reactivation", {
    name: "Reconnect Offer",
    description: "Welcome-back offer for lapsed clients.",
    valueLabel: "Welcome back",
    offerText: "Come back in and enjoy a small welcome-back treat.",
  }),
  seedOffer("open_slot", {
    name: "Open Chair Priority",
    description: "Priority opening before public release.",
    valueLabel: "Priority opening",
    offerText: "A private opening is available before it is released publicly.",
  }),
  seedOffer("service", {
    name: "Service Spotlight",
    description: "Featured service spotlight offer.",
    valueLabel: "Featured service",
    offerText: "A service spotlight was selected for you.",
  }),
  seedOffer("seasonal", {
    name: "Seasonal Treat",
    description: "Limited seasonal client offer.",
    valueLabel: "Seasonal offer",
    offerText: "A seasonal client-only offer is available for a limited time.",
  }),
];

const DEFAULT_BY_CATEGORY = new Map(DEFAULT_OFFERS.map((offer) => [offer.category, offer]));

export function getDefaultOfferForCategory(category: VmbOfferCategory): VmbOffer {
  const offer = DEFAULT_BY_CATEGORY.get(category);
  if (!offer) {
    throw new Error(`Missing default offer for ${category}`);
  }
  return { ...offer };
}

export function getAllDefaultOffers(): VmbOffer[] {
  return VMB_OFFER_CATEGORIES.map((category) => getDefaultOfferForCategory(category));
}
