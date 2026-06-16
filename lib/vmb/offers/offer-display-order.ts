import type { VmbOffer } from "./offer-types";

/** Business-priority order for admin offer selectors — names only; IDs unchanged. */
export const OFFER_SELECTOR_DISPLAY_NAMES: readonly string[] = [
  "PCN Early Access",
  "New Client Welcome",
  "Referral Thank You",
  "Open Chair Priority",
  "Refresh Add-On",
  "Reconnect Offer",
  "Service Spotlight",
  "Birthday Treat",
  "Seasonal Treat",
] as const;

const OFFER_SELECTOR_RANK = new Map(
  OFFER_SELECTOR_DISPLAY_NAMES.map((name, index) => [name, index]),
);

/** Sort active offers for card-builder / admin selectors without changing offer IDs. */
export function sortOffersForSelectorDisplay(offers: VmbOffer[]): VmbOffer[] {
  return [...offers].sort((a, b) => {
    const rankA = OFFER_SELECTOR_RANK.get(a.name) ?? OFFER_SELECTOR_DISPLAY_NAMES.length;
    const rankB = OFFER_SELECTOR_RANK.get(b.name) ?? OFFER_SELECTOR_DISPLAY_NAMES.length;
    if (rankA !== rankB) return rankA - rankB;
    return a.name.localeCompare(b.name);
  });
}
