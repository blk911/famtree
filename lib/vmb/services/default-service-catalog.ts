import {
  DEMO_BIRTHDAY_OFFER_ADDON_IDS,
  DEMO_BIRTHDAY_OFFER_SERVICE_IDS,
  listAddonsForServiceOffer,
  listCatalogServiceOffers,
  OFFER_ADDON_MAP,
  SERVICE_ADDONS,
  SERVICE_CATEGORIES,
  SERVICE_OFFERS,
} from "./canonical-service-catalog";
import type { CatalogServiceOffer, ServiceCategoryId } from "./canonical-catalog-types";
import type { VmbServiceOption } from "./service-option-types";
import type { VmbService, VmbServiceCategory } from "./service-types";

const NOW = "2026-06-12T00:00:00.000Z";

function offerToService(offer: CatalogServiceOffer): VmbService {
  return {
    id: offer.id,
    category: offer.categoryId as VmbServiceCategory,
    name: offer.name,
    description: offer.description,
    basePriceCents: offer.basePriceCents,
    durationMinutes: offer.durationMinutes,
    active: offer.active,
    displayOrder: offer.displayOrder,
    isDefault: true,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function addonToOption(serviceId: string, addon: (typeof SERVICE_ADDONS)[number], displayOrder: number): VmbServiceOption {
  return {
    id: addon.id,
    serviceId,
    name: addon.name,
    groupName: "Add-On",
    active: addon.active,
    displayOrder,
    isDefault: true,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

export const DEFAULT_SERVICES: VmbService[] = listCatalogServiceOffers().map(offerToService);

export const DEFAULT_SERVICE_OPTIONS: VmbServiceOption[] = OFFER_ADDON_MAP.map((entry, index) => {
  const addon = SERVICE_ADDONS.find((item) => item.id === entry.addonId);
  if (!addon) {
    throw new Error(`Missing addon ${entry.addonId} for ${entry.serviceOfferId}`);
  }
  return addonToOption(entry.serviceOfferId, addon, index + 1);
});

const SERVICE_BY_ID = new Map(DEFAULT_SERVICES.map((service) => [service.id, service]));
const OPTIONS_BY_SERVICE = new Map<string, VmbServiceOption[]>();

for (const option of DEFAULT_SERVICE_OPTIONS) {
  const list = OPTIONS_BY_SERVICE.get(option.serviceId) ?? [];
  list.push(option);
  OPTIONS_BY_SERVICE.set(option.serviceId, list);
}

export function getAllDefaultServices(): VmbService[] {
  return DEFAULT_SERVICES.map((service) => ({ ...service }));
}

export function getAllDefaultServiceOptions(): VmbServiceOption[] {
  return DEFAULT_SERVICE_OPTIONS.map((option) => ({ ...option }));
}

export function getDefaultService(serviceId: string): VmbService | undefined {
  const service = SERVICE_BY_ID.get(serviceId);
  return service ? { ...service } : undefined;
}

export function getDefaultOptionsForService(serviceId: string): VmbServiceOption[] {
  return (OPTIONS_BY_SERVICE.get(serviceId) ?? []).map((option) => ({ ...option }));
}

export function getDefaultServicesForCategory(categoryId: ServiceCategoryId): VmbService[] {
  return listCatalogServiceOffers(categoryId).map(offerToService);
}

export function getDefaultOptionsForServiceFromCatalog(serviceId: string): VmbServiceOption[] {
  return listAddonsForServiceOffer(serviceId).map((addon, index) =>
    addonToOption(serviceId, addon, index + 1),
  );
}

export {
  DEMO_BIRTHDAY_OFFER_SERVICE_IDS,
  DEMO_BIRTHDAY_OFFER_ADDON_IDS as DEMO_BIRTHDAY_OFFER_OPTION_IDS,
  SERVICE_CATEGORIES,
  SERVICE_OFFERS,
  SERVICE_ADDONS,
  OFFER_ADDON_MAP,
};
