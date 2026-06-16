/** Platform canonical service catalog — single source of truth for VMB. */

export type ServiceCategoryId =
  | "nails"
  | "hair"
  | "lashes"
  | "brows"
  | "waxing"
  | "skin"
  | "massage"
  | "barber";

export type ServiceCategory = {
  id: ServiceCategoryId;
  name: string;
  displayOrder: number;
};

/** Platform service offer — stable catalogServiceId used across invites, offers, recommendations. */
export type CatalogServiceOffer = {
  id: string;
  categoryId: ServiceCategoryId;
  name: string;
  basePriceCents: number;
  durationMinutes: number;
  description?: string;
  displayOrder: number;
  active: boolean;
};

export type ServiceAddon = {
  id: string;
  name: string;
  displayOrder: number;
  active: boolean;
};

/** Maps catalog service offers to available add-ons. */
export type OfferAddonMapEntry = {
  serviceOfferId: string;
  addonId: string;
};

export type CatalogServiceOfferWithAddons = CatalogServiceOffer & {
  addonIds: string[];
};

export type SalonServiceConfig = {
  salonId: string;
  catalogServiceId: string;
  enabled: boolean;
  priceCents: number;
  durationMinutes: number;
  enabledAddonIds: string[];
  updatedAt: string;
};

export type ResolvedSalonService = CatalogServiceOffer & {
  enabled: boolean;
  priceCents: number;
  durationMinutes: number;
  addons: Array<ServiceAddon & { enabled: boolean }>;
};
