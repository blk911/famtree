import type { AdminNailInviteCardOffer } from "@/lib/vmb/invite-templates/admin-nail-invite-card-content";
import type { VmbInviteOfferCategory } from "@/lib/vmb/invite-templates/invite-template-types";
import type { VmbInviteTemplate } from "@/lib/vmb/invite-templates/invite-template-types";
import type { VmbOffer, VmbOfferCategory } from "@/lib/vmb/offers/offer-types";

const INVITE_TO_OFFER_CATEGORY: Partial<
  Record<VmbInviteOfferCategory, VmbOfferCategory>
> = {
  pcn: "pcn",
  birthday: "birthday",
  referral: "referral",
  open_chair: "open_slot",
  refresh: "refresh",
  vip: "vip",
  new_client: "new_client",
  seasonal: "seasonal",
  self_care: "service",
  vacation: "seasonal",
  wedding: "seasonal",
};

export function mapInviteOfferCategoryToOfferCategory(
  category: VmbInviteOfferCategory | undefined,
): VmbOfferCategory | undefined {
  if (!category) return undefined;
  return INVITE_TO_OFFER_CATEGORY[category];
}

export function pickDefaultAttachedOfferId(
  template: VmbInviteTemplate | undefined,
  offers: readonly VmbOffer[],
): string {
  if (!template || offers.length === 0) return "";

  const active = offers.filter((offer) => offer.active);
  if (active.length === 0) return "";

  const mapped = mapInviteOfferCategoryToOfferCategory(template.defaultOfferCategory);
  const inCategory = mapped
    ? active.filter((offer) => offer.category === mapped)
    : active;

  const pool = inCategory.length > 0 ? inCategory : active;
  const preferred = pool.find((offer) => offer.isDefault) ?? pool[0];

  return preferred?.id ?? "";
}

export function offerToAdminNailInviteCardOffer(
  offer: VmbOffer | undefined,
  serviceNames: readonly string[] = [],
  optionNames: readonly string[] = [],
): AdminNailInviteCardOffer | undefined {
  if (!offer) return undefined;
  return {
    name: offer.name,
    description: offer.offerText || offer.description,
    price: offer.valueLabel,
    serviceName: serviceNames.length > 0 ? serviceNames.join(", ") : undefined,
    addonLabels: optionNames.length > 0 ? [...optionNames] : undefined,
  };
}
