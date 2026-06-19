import type {
  CatalogServiceOffer,
  ResolvedSalonService,
  SalonServiceConfig,
  ServiceCategoryId,
} from "./canonical-catalog-types";
import {
  formatCatalogDuration,
  formatCatalogPrice,
  getCatalogServiceOffer,
  listAddonsForServiceOffer,
  listCatalogServiceOffers,
  listServiceCategories,
} from "./canonical-service-catalog";
import { getDefaultPresetForOffer, listDefaultPresetsForCategory } from "./default-service-presets";
import {
  buildDefaultSalonConfigFromPreset,
  hasSalonSavedConfig,
  mergePresetsWithSalonConfigs,
  sanitizeSalonServiceConfigForPreset,
} from "./merge-salon-service-offers";
import { listServicePresetCards } from "./service-preset-store";
import {
  enabledFromSalonServiceStatus,
  normalizeSalonServiceConfig,
  resolveSalonServiceStatus,
  resolveStatusAfterLifecycleAction,
  type SalonServiceLifecycleAction,
} from "./salon-service-lifecycle";
import { resolveVmbStorageBackend } from "@/lib/vmb/db";
import { getVmbSalonServiceConfigsFile } from "@/lib/vmb/paths";
import { readJsonArray, writeJsonArray } from "@/lib/vmb/runtime-json-store";
import { assertVmbWritableBackend, vmbProductionRequiresPostgres } from "@/lib/vmb/storage-policy";
import {
  deleteAllSalonServiceConfigsPostgres,
  listSalonServiceConfigsPostgres,
  upsertSalonServiceConfigPostgres,
} from "./salon-service-config-store-postgres";

export const SALON_SERVICE_CONFIG_POSTGRES_REQUIRED = "SALON_SERVICE_CONFIG_POSTGRES_REQUIRED";

type StoredSalonServiceConfig = { salonId: string; config: SalonServiceConfig };

function isStoredConfig(item: unknown): item is StoredSalonServiceConfig {
  if (!item || typeof item !== "object") return false;
  const row = item as StoredSalonServiceConfig;
  return typeof row.salonId === "string" && !!row.config?.catalogServiceId;
}

async function listConfigsJson(): Promise<StoredSalonServiceConfig[]> {
  return readJsonArray(getVmbSalonServiceConfigsFile(), isStoredConfig);
}

async function assertWritable(): Promise<{ ok: true; backend: "postgres" | "json" } | { error: string }> {
  const writable = await assertVmbWritableBackend();
  if (!writable.ok) {
    if (vmbProductionRequiresPostgres()) {
      return { error: SALON_SERVICE_CONFIG_POSTGRES_REQUIRED };
    }
    return { error: writable.error };
  }
  return { ok: true, backend: writable.backend };
}

async function loadSalonConfigs(salonId: string): Promise<SalonServiceConfig[]> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    return listSalonServiceConfigsPostgres(salonId);
  }
  const all = await listConfigsJson();
  return all.filter((row) => row.salonId === salonId).map((row) => row.config);
}

function defaultConfigForOffer(salonId: string, offer: CatalogServiceOffer): SalonServiceConfig {
  const preset = getDefaultPresetForOffer(offer.id);
  if (preset) return buildDefaultSalonConfigFromPreset(salonId, preset);
  const addonIds = listAddonsForServiceOffer(offer.id).map((addon) => addon.id);
  return {
    salonId,
    catalogServiceId: offer.id,
    enabled: false,
    status: "draft",
    priceCents: offer.basePriceCents,
    durationMinutes: offer.durationMinutes,
    enabledAddonIds: addonIds,
    updatedAt: new Date(0).toISOString(),
  };
}

function mergeConfig(
  salonId: string,
  offer: CatalogServiceOffer,
  stored?: SalonServiceConfig,
): SalonServiceConfig {
  const preset = getDefaultPresetForOffer(offer.id);
  const defaults = preset
    ? buildDefaultSalonConfigFromPreset(salonId, preset)
    : defaultConfigForOffer(salonId, offer);
  if (!stored || !hasSalonSavedConfig(stored)) return defaults;
  const sanitized = preset
    ? sanitizeSalonServiceConfigForPreset(preset, stored)
    : {
        catalogServiceId: offer.id,
        enabled: stored.enabled,
        status: resolveSalonServiceStatus(stored),
        priceCents: stored.priceCents,
        durationMinutes: stored.durationMinutes,
        enabledAddonIds: stored.enabledAddonIds,
        addonPriceCentsById: stored.addonPriceCentsById ?? {},
      };
  return {
    ...defaults,
    ...sanitized,
    salonId,
    catalogServiceId: offer.id,
    updatedAt: stored.updatedAt,
  };
}

export function resolveSalonService(
  offer: CatalogServiceOffer,
  config: SalonServiceConfig,
): ResolvedSalonService {
  const addons = listAddonsForServiceOffer(offer.id).map((addon) => ({
    ...addon,
    enabled: config.enabledAddonIds.includes(addon.id),
  }));
  return {
    ...offer,
    enabled: enabledFromSalonServiceStatus(resolveSalonServiceStatus(config)),
    priceCents: config.priceCents,
    durationMinutes: config.durationMinutes,
    addons,
  };
}

export async function getSalonPrimaryCategory(salonId: string): Promise<ServiceCategoryId> {
  const configs = await loadSalonConfigs(salonId);
  const active = configs.find((config) => resolveSalonServiceStatus(config) === "active");
  if (active) {
    const offer = getCatalogServiceOffer(active.catalogServiceId);
    if (offer) return offer.categoryId;
  }
  return "nails";
}

export async function getSalonServicesForCategory(
  salonId: string,
  categoryId: ServiceCategoryId,
): Promise<ResolvedSalonService[]> {
  const stored = await loadSalonConfigs(salonId);
  const byServiceId = new Map(stored.map((config) => [config.catalogServiceId, config]));
  return listCatalogServiceOffers(categoryId).map((offer) =>
    resolveSalonService(offer, mergeConfig(salonId, offer, byServiceId.get(offer.id))),
  );
}

export async function getActiveSalonFacingServicesForCategory(
  salonId: string,
  categoryId: ServiceCategoryId,
) {
  const services = await getSalonFacingServicesForCategory(salonId, categoryId);
  return services.filter((service) => service.status === "active");
}

export async function getActiveSalonServiceIds(salonId: string): Promise<string[]> {
  const categoryId = await getSalonPrimaryCategory(salonId);
  const active = await getActiveSalonFacingServicesForCategory(salonId, categoryId);
  return active.map((service) => service.serviceOfferId);
}

export async function getSalonFacingServicesForCategory(
  salonId: string,
  categoryId: ServiceCategoryId,
) {
  const presets = await listServicePresetCards(categoryId);
  const stored = await loadSalonConfigs(salonId);
  return mergePresetsWithSalonConfigs(presets, stored);
}

export async function getSalonServiceConfigsForCategory(
  salonId: string,
  categoryId: ServiceCategoryId,
): Promise<SalonServiceConfig[]> {
  const stored = await loadSalonConfigs(salonId);
  return stored.filter((config) => {
    const offer = getCatalogServiceOffer(config.catalogServiceId);
    return offer?.categoryId === categoryId;
  });
}

export async function getSalonServiceConfig(
  salonId: string,
  catalogServiceId: string,
): Promise<SalonServiceConfig | undefined> {
  const offer = getCatalogServiceOffer(catalogServiceId);
  if (!offer) return undefined;
  const stored = (await loadSalonConfigs(salonId)).find((config) => config.catalogServiceId === catalogServiceId);
  return mergeConfig(salonId, offer, stored);
}

export async function upsertSalonServiceConfig(
  salonId: string,
  input: Partial<Omit<SalonServiceConfig, "salonId" | "updatedAt">> & {
    catalogServiceId: string;
    lifecycleAction?: SalonServiceLifecycleAction;
  },
): Promise<{ config: SalonServiceConfig } | { error: string }> {
  const offer = getCatalogServiceOffer(input.catalogServiceId);
  if (!offer) return { error: "Service not found in catalog" };

  const writable = await assertWritable();
  if ("error" in writable) return writable;

  const existingStored = (await loadSalonConfigs(salonId)).find(
    (config) => config.catalogServiceId === input.catalogServiceId,
  );
  const existing = mergeConfig(salonId, offer, existingStored);
  const currentStatus = resolveSalonServiceStatus(existingStored);
  const lifecycleAction = input.lifecycleAction ?? "save";
  const nextStatus = resolveStatusAfterLifecycleAction(currentStatus, lifecycleAction);
  if (typeof nextStatus === "object" && "error" in nextStatus) {
    return nextStatus;
  }

  const mergedInput = {
    catalogServiceId: input.catalogServiceId,
    enabled: enabledFromSalonServiceStatus(nextStatus),
    status: nextStatus,
    priceCents: input.priceCents ?? existing.priceCents,
    durationMinutes: input.durationMinutes ?? existing.durationMinutes,
    enabledAddonIds: input.enabledAddonIds ?? existing.enabledAddonIds,
    addonPriceCentsById: input.addonPriceCentsById ?? existing.addonPriceCentsById ?? {},
  };

  const preset = getDefaultPresetForOffer(offer.id);
  const sanitized = preset
    ? sanitizeSalonServiceConfigForPreset(preset, mergedInput)
    : {
        catalogServiceId: mergedInput.catalogServiceId,
        enabled: mergedInput.enabled,
        status: mergedInput.status,
        priceCents: mergedInput.priceCents,
        durationMinutes: mergedInput.durationMinutes,
        enabledAddonIds: mergedInput.enabledAddonIds,
        addonPriceCentsById: mergedInput.addonPriceCentsById,
      };

  const payload: SalonServiceConfig = normalizeSalonServiceConfig(
    mergeConfig(salonId, offer, {
      ...sanitized,
      salonId,
      updatedAt: new Date().toISOString(),
    }),
  );
  payload.updatedAt = new Date().toISOString();

  if (writable.backend === "postgres") {
    const saved = await upsertSalonServiceConfigPostgres(salonId, payload);
    if ("error" in saved) {
      return vmbProductionRequiresPostgres() ? { error: SALON_SERVICE_CONFIG_POSTGRES_REQUIRED } : saved;
    }
    return saved;
  }

  const all = await listConfigsJson();
  const others = all.filter(
    (row) => !(row.salonId === salonId && row.config.catalogServiceId === payload.catalogServiceId),
  );
  await writeJsonArray(getVmbSalonServiceConfigsFile(), [...others, { salonId, config: payload }]);
  return { config: payload };
}

export async function clearSalonServiceConfigs(salonId: string): Promise<void> {
  await deleteAllSalonServiceConfigsPostgres(salonId);
  const all = await listConfigsJson();
  await writeJsonArray(
    getVmbSalonServiceConfigsFile(),
    all.filter((row) => row.salonId !== salonId),
  );
}

export { listServiceCategories, formatCatalogPrice, formatCatalogDuration };
