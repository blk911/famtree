import type { ServiceCategoryId } from "./canonical-catalog-types";
import {
  listAddonsForServiceOffer,
  listCatalogServiceOffers,
} from "./canonical-service-catalog";
import type { ServiceAddonPreset, ServicePresetCard } from "./service-preset-types";
import { presetIdForServiceOffer } from "./service-preset-types";

const GEL_X_ADDON_PRICES: Record<string, number> = {
  "addon-medium-length": 1000,
  "addon-long-length": 2000,
  "addon-xl-length": 3500,
  "addon-french": 1200,
  "addon-chrome": 1500,
  "addon-cat-eye": 1500,
  "addon-aura": 2000,
  "addon-ombre": 2000,
  "addon-crystals": 1500,
  "addon-charms": 1500,
  "addon-freestyle-art": 2500,
};

function addonPresetsForOffer(
  serviceOfferId: string,
  addonIds: string[],
  priceMap: Record<string, number> = GEL_X_ADDON_PRICES,
): ServiceAddonPreset[] {
  return listAddonsForServiceOffer(serviceOfferId).map((addon, index) => ({
    addonId: addon.id,
    label: addon.name,
    priceCents: priceMap[addon.id] ?? 0,
    active: true,
    defaultSelected: false,
    sortOrder: index + 1,
  }));
}

function gelXAddonPresets(): ServiceAddonPreset[] {
  return addonPresetsForOffer("default-nails-gel-x", []);
}

function card(
  serviceOfferId: string,
  fields: Omit<
    ServicePresetCard,
    "id" | "categoryId" | "serviceOfferId" | "addonPresets" | "updatedAt"
  > & { addonPresets?: ServiceAddonPreset[] },
): ServicePresetCard {
  return {
    id: presetIdForServiceOffer(serviceOfferId),
    categoryId: "nails",
    serviceOfferId,
    addonPresets: fields.addonPresets ?? [],
    ...fields,
  };
}

export const DEFAULT_NAILS_SERVICE_PRESETS: ServicePresetCard[] = [
  card("default-nails-gel-manicure", {
    displayName: "Gel Manicure",
    shortDescription: "A clean gel polish manicure for natural nails with lasting shine.",
    basePriceCents: 6000,
    durationMinutes: 45,
    includedText: "Nail prep, shaping, cuticle care, gel polish, finish.",
    defaultEnabled: false,
    active: true,
    sortOrder: 1,
  }),
  card("default-nails-builder-gel", {
    displayName: "Builder Gel",
    shortDescription: "Added strength for natural nails using builder gel overlay.",
    basePriceCents: 7500,
    durationMinutes: 60,
    includedText: "Nail prep, structure layer, shaping, gel color, finish.",
    defaultEnabled: false,
    active: true,
    sortOrder: 2,
    addonPresets: addonPresetsForOffer("default-nails-builder-gel", []),
  }),
  card("default-nails-structured-gel", {
    displayName: "Structured Gel",
    shortDescription: "A premium structured manicure for stronger, smoother natural nails.",
    basePriceCents: 8000,
    durationMinutes: 75,
    includedText: "Detailed prep, structured base, shaping, gel color, finish.",
    defaultEnabled: false,
    active: true,
    sortOrder: 3,
    addonPresets: addonPresetsForOffer("default-nails-structured-gel", []),
  }),
  card("default-nails-gel-x", {
    displayName: "Gel-X Extensions",
    shortDescription: "Soft gel extensions with shape, length, and polish.",
    basePriceCents: 9000,
    durationMinutes: 90,
    includedText: "Nail prep, short extensions, standard shape, gel color, finish.",
    defaultEnabled: false,
    active: true,
    sortOrder: 4,
    addonPresets: gelXAddonPresets(),
  }),
  card("default-nails-acrylic-extensions", {
    displayName: "Acrylic Extensions",
    shortDescription: "Classic acrylic extensions with strength, shape, and polish.",
    basePriceCents: 9500,
    durationMinutes: 120,
    includedText: "Nail prep, short acrylic extensions, standard shape, polish, finish.",
    defaultEnabled: false,
    active: true,
    sortOrder: 5,
    addonPresets: addonPresetsForOffer("default-nails-acrylic-extensions", []),
  }),
  card("default-nails-smart-pedicure", {
    displayName: "Smart Pedicure",
    shortDescription: "A clean, detailed pedicure focused on care, polish, and comfort.",
    basePriceCents: 6500,
    durationMinutes: 60,
    includedText: "Foot soak or dry prep, nail shaping, cuticle care, polish, finish.",
    defaultEnabled: false,
    active: true,
    sortOrder: 6,
  }),
  card("default-nails-fill-refresh", {
    displayName: "Fill & Refresh",
    shortDescription: "Maintenance for existing enhancements, reshaping, and fresh finish.",
    basePriceCents: 6000,
    durationMinutes: 75,
    includedText: "Growth fill, reshaping, balance correction, polish, finish.",
    defaultEnabled: false,
    active: true,
    sortOrder: 7,
  }),
];

const DEFAULT_BY_OFFER_ID = new Map(
  DEFAULT_NAILS_SERVICE_PRESETS.map((preset) => [preset.serviceOfferId, preset]),
);

export function getDefaultPresetForOffer(serviceOfferId: string): ServicePresetCard | undefined {
  const preset = DEFAULT_BY_OFFER_ID.get(serviceOfferId);
  return preset ? clonePreset(preset) : undefined;
}

export function listDefaultPresetsForCategory(categoryId: ServiceCategoryId): ServicePresetCard[] {
  if (categoryId === "nails") {
    return DEFAULT_NAILS_SERVICE_PRESETS.map(clonePreset);
  }
  return listCatalogServiceOffers(categoryId).map(synthesizePresetFromCatalog);
}

function synthesizePresetFromCatalog(offer: {
  id: string;
  categoryId: ServiceCategoryId;
  name: string;
  basePriceCents: number;
  durationMinutes: number;
  description?: string;
  displayOrder: number;
}): ServicePresetCard {
  const addons = listAddonsForServiceOffer(offer.id);
  return {
    id: presetIdForServiceOffer(offer.id),
    categoryId: offer.categoryId,
    serviceOfferId: offer.id,
    displayName: offer.name,
    shortDescription: offer.description ?? "",
    basePriceCents: offer.basePriceCents,
    durationMinutes: offer.durationMinutes,
    includedText: "",
    defaultEnabled: false,
    active: true,
    sortOrder: offer.displayOrder,
    addonPresets: addons.map((addon, index) => ({
      addonId: addon.id,
      label: addon.name,
      priceCents: 0,
      active: true,
      defaultSelected: false,
      sortOrder: index + 1,
    })),
  };
}

function clonePreset(preset: ServicePresetCard): ServicePresetCard {
  return {
    ...preset,
    addonPresets: preset.addonPresets.map((addon) => ({ ...addon })),
  };
}

export function clonePresetCard(preset: ServicePresetCard): ServicePresetCard {
  return clonePreset(preset);
}
