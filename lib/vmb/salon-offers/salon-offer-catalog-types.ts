/** Salon-built sellable offers — powered by enabled services, used in invites. */

export type SalonOfferCatalogEntry = {
  id: string;
  salonId: string;
  name: string;
  description: string;
  /** Canonical catalog service id, e.g. default-nails-gel-x */
  serviceId: string;
  addonIds: string[];
  /** Service + selected add-ons before override */
  calculatedPriceCents: number;
  /** Client-facing offer price (may override calculated) */
  priceCents: number;
  priceOverrideCents?: number | null;
  /** Optional invite offer category for template matching */
  offerCategoryId?: string;
  active: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type SalonOfferAddonRef = {
  offerId: string;
  addonId: string;
};

export type ResolvedSalonOfferDisplay = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  calculatedPriceCents: number;
  imageUrl?: string;
  serviceName: string;
  includedLines: string[];
  addonLabels: string[];
  /** Set when the linked salon service is disabled or no longer on the menu. */
  serviceUnavailable?: boolean;
  serviceWarning?: string;
};

export type CreateSalonOfferInput = {
  name: string;
  description: string;
  serviceId: string;
  addonIds: string[];
  priceOverrideCents?: number | null;
  imageUrl?: string;
  active?: boolean;
};

export type UpdateSalonOfferInput = Partial<CreateSalonOfferInput> & {
  active?: boolean;
};
