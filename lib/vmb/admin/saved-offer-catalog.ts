import type { VmbOffer } from "@/lib/vmb/offers/offer-types";

/** Offers persisted via Offer Catalog (excludes platform default promo slots). */
export function listSavedCatalogOffers(offers: readonly VmbOffer[]): VmbOffer[] {
  return offers
    .filter((offer) => !offer.isDefault && offer.active)
    .sort((a, b) => a.name.localeCompare(b.name));
}
