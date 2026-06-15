export type VmbOfferCategory =
  | "new_client"
  | "birthday"
  | "pcn"
  | "vip"
  | "referral"
  | "reactivation"
  | "refresh"
  | "open_slot"
  | "service"
  | "seasonal";

export type VmbOfferSource =
  | "default"
  | "template"
  | "ggen"
  | "vagaro"
  | "website"
  | "instagram"
  | "manual";

export const VMB_OFFER_CATEGORIES: readonly VmbOfferCategory[] = [
  "new_client",
  "birthday",
  "pcn",
  "vip",
  "referral",
  "reactivation",
  "refresh",
  "open_slot",
  "service",
  "seasonal",
] as const;

export type VmbOffer = {
  id: string;
  salonId?: string;
  name: string;
  category: VmbOfferCategory;
  description: string;
  valueLabel?: string;
  offerText: string;
  terms?: string;
  serviceTags?: string[];
  serviceIds?: string[];
  serviceOptionIds?: string[];
  active: boolean;
  isDefault: boolean;
  source?: VmbOfferSource;
  confidence?: number;
  startsAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CardPreviewOffer = {
  id: string;
  name: string;
  valueLabel?: string;
  offerText: string;
  terms?: string;
  category: string;
  serviceIds?: string[];
  serviceOptionIds?: string[];
  serviceName?: string;
  upgradeName?: string;
};
