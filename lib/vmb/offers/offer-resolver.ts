import type { VmbCardTemplate } from "@/lib/vmb/card-templates/card-template-types";
import type { VmbOffer, VmbOfferCategory } from "@/lib/vmb/offers/offer-types";
import { getDefaultOfferForCategory } from "@/lib/vmb/offers/default-offers";

export function resolveOfferForCategory(
  offers: VmbOffer[],
  category: VmbOfferCategory,
): VmbOffer | undefined {
  const active = offers.filter((offer) => offer.active && offer.category === category);
  const custom = active.find((offer) => !offer.isDefault);
  if (custom) return custom;
  const fallback = active.find((offer) => offer.isDefault);
  if (fallback) return fallback;
  return getDefaultOfferForCategory(category);
}

export function resolveOfferForTemplate(
  template: VmbCardTemplate,
  offers: VmbOffer[],
): VmbOffer | undefined {
  if (!template.offerCategory || template.offerMode === "none") {
    return undefined;
  }

  const resolved = resolveOfferForCategory(offers, template.offerCategory);
  if (resolved) return resolved;

  if (template.offerMode === "required") {
    return getDefaultOfferForCategory(template.offerCategory);
  }

  return undefined;
}

export function shouldIncludeOffer(
  template: VmbCardTemplate,
  offer: VmbOffer | undefined,
  includeOffer = true,
): boolean {
  if (!includeOffer || template.offerMode === "none") return false;
  if (template.offerMode === "required") return Boolean(offer ?? template.offerCategory);
  return Boolean(offer);
}

export function toCardPreviewOffer(offer: VmbOffer) {
  return {
    id: offer.id,
    name: offer.name,
    valueLabel: offer.valueLabel,
    offerText: offer.offerText,
    terms: offer.terms,
    category: offer.category,
  };
}
