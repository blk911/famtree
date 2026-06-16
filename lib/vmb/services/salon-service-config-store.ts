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
  const addonIds = listAddonsForServiceOffer(offer.id).map((addon) => addon.id);
  return {
    salonId,
    catalogServiceId: offer.id,
    enabled: false,
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
  const defaults = defaultConfigForOffer(salonId, offer);
  if (!stored) return defaults;
  const validAddonIds = new Set(listAddonsForServiceOffer(offer.id).map((addon) => addon.id));
  return {
    ...defaults,
    ...stored,
    salonId,
    catalogServiceId: offer.id,
    enabledAddonIds: stored.enabledAddonIds.filter((id) => validAddonIds.has(id)),
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
    enabled: config.enabled,
    priceCents: config.priceCents,
    durationMinutes: config.durationMinutes,
    addons,
  };
}

export async function getSalonPrimaryCategory(salonId: string): Promise<ServiceCategoryId> {
  const configs = await loadSalonConfigs(salonId);
  const enabled = configs.find((config) => config.enabled);
  if (enabled) {
    const offer = getCatalogServiceOffer(enabled.catalogServiceId);
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
  input: Omit<SalonServiceConfig, "salonId" | "updatedAt">,
): Promise<{ config: SalonServiceConfig } | { error: string }> {
  const offer = getCatalogServiceOffer(input.catalogServiceId);
  if (!offer) return { error: "Service not found in catalog" };

  const writable = await assertWritable();
  if ("error" in writable) return writable;

  const payload: SalonServiceConfig = mergeConfig(salonId, offer, {
    ...input,
    salonId,
    updatedAt: new Date().toISOString(),
  });
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
