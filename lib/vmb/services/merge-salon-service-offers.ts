import type { SalonServiceConfig } from "./canonical-catalog-types";

import { getDefaultPresetForOffer, listDefaultPresetsForCategory } from "./default-service-presets";

import type { ServicePresetCard } from "./service-preset-types";

import type { SalonFacingServiceOffer } from "./service-preset-types";

import type { ServiceCategoryId } from "./canonical-catalog-types";

import { listAddonsForServiceOffer, listCatalogServiceOffers } from "./canonical-service-catalog";



const EPOCH = new Date(0).toISOString();



export function hasSalonSavedConfig(config: SalonServiceConfig | undefined): boolean {

  return Boolean(config && config.updatedAt !== EPOCH);

}



function validAddonIdsForOffer(preset: ServicePresetCard): Set<string> {

  const catalogIds = listAddonsForServiceOffer(preset.serviceOfferId).map((addon) => addon.id);

  const presetIds = preset.addonPresets.filter((addon) => addon.active).map((addon) => addon.addonId);

  return new Set([...catalogIds, ...presetIds]);

}



export function mergePresetWithSalonConfig(

  preset: ServicePresetCard,

  stored?: SalonServiceConfig,

): SalonFacingServiceOffer {

  const saved = hasSalonSavedConfig(stored);

  const activeAddonPresets = preset.addonPresets

    .filter((addon) => addon.active)

    .sort((a, b) => a.sortOrder - b.sortOrder);



  const defaultAddonIds = new Set(

    activeAddonPresets.filter((addon) => addon.defaultSelected).map((addon) => addon.addonId),

  );

  const enabledAddonIds = saved ? new Set(stored!.enabledAddonIds) : defaultAddonIds;

  const salonAddonPrices = stored?.addonPriceCentsById ?? {};



  return {

    serviceOfferId: preset.serviceOfferId,

    displayName: preset.displayName,

    shortDescription: preset.shortDescription,

    includedText: preset.includedText,

    priceCents: saved ? stored!.priceCents : preset.basePriceCents,

    durationMinutes: saved ? stored!.durationMinutes : preset.durationMinutes,

    enabled: saved ? stored!.enabled : preset.defaultEnabled,

    sortOrder: preset.sortOrder,

    adminBasePriceCents: preset.basePriceCents,

    adminDurationMinutes: preset.durationMinutes,

    hasSalonConfig: saved,

    addons: activeAddonPresets.map((addon) => ({

      addonId: addon.addonId,

      label: addon.label,

      defaultPriceCents: addon.priceCents,

      priceCents:

        saved && typeof salonAddonPrices[addon.addonId] === "number"

          ? salonAddonPrices[addon.addonId]!

          : addon.priceCents,

      enabled: enabledAddonIds.has(addon.addonId),

    })),

  };

}



export function mergePresetsWithSalonConfigs(

  presets: ServicePresetCard[],

  configs: SalonServiceConfig[],

): SalonFacingServiceOffer[] {

  const byOfferId = new Map(configs.map((config) => [config.catalogServiceId, config]));

  return presets

    .filter((preset) => preset.active)

    .sort((a, b) => a.sortOrder - b.sortOrder)

    .map((preset) => mergePresetWithSalonConfig(preset, byOfferId.get(preset.serviceOfferId)));

}



export function buildDefaultSalonConfigFromPreset(

  salonId: string,

  preset: ServicePresetCard,

): SalonServiceConfig {

  const enabledAddonIds = preset.addonPresets

    .filter((addon) => addon.active && addon.defaultSelected)

    .map((addon) => addon.addonId);

  return {

    salonId,

    catalogServiceId: preset.serviceOfferId,

    enabled: preset.defaultEnabled,

    priceCents: preset.basePriceCents,

    durationMinutes: preset.durationMinutes,

    enabledAddonIds,

    addonPriceCentsById: {},

    updatedAt: EPOCH,

  };

}



export function sanitizeSalonServiceConfigForPreset(

  preset: ServicePresetCard,

  input: Omit<SalonServiceConfig, "salonId" | "updatedAt">,

): Omit<SalonServiceConfig, "salonId" | "updatedAt"> {

  const validAddonIds = validAddonIdsForOffer(preset);

  const addonPriceCentsById: Record<string, number> = {};

  for (const [addonId, cents] of Object.entries(input.addonPriceCentsById ?? {})) {

    if (!validAddonIds.has(addonId)) continue;

    if (typeof cents !== "number" || !Number.isFinite(cents)) continue;

    addonPriceCentsById[addonId] = Math.max(0, Math.round(cents));

  }

  return {

    catalogServiceId: preset.serviceOfferId,

    enabled: input.enabled,

    priceCents: Math.max(0, Math.round(input.priceCents)),

    durationMinutes: Math.max(15, Math.round(input.durationMinutes)),

    enabledAddonIds: (input.enabledAddonIds ?? []).filter((id) => validAddonIds.has(id)),

    addonPriceCentsById,

  };

}



export function listBaselinePresetsForCategory(categoryId: ServiceCategoryId): ServicePresetCard[] {

  const defaults = listDefaultPresetsForCategory(categoryId);

  const defaultByOffer = new Map(defaults.map((preset) => [preset.serviceOfferId, preset]));

  return listCatalogServiceOffers(categoryId).map((offer) => {

    const seeded = defaultByOffer.get(offer.id);

    if (seeded) return seeded;

    const fallback = getDefaultPresetForOffer(offer.id);

    if (fallback) return fallback;

    return defaults.find((preset) => preset.serviceOfferId === offer.id)!;

  });

}


