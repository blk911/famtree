import type { ServiceCategoryId } from "./canonical-catalog-types";
import {
  getCatalogServiceOffer,
  getServiceCategory,
  listAddonsForServiceOffer,
} from "./canonical-service-catalog";
import { clonePresetCard, listDefaultPresetsForCategory } from "./default-service-presets";
import { listBaselinePresetsForCategory } from "./merge-salon-service-offers";
import type { ServiceAddonPreset, ServicePresetCard } from "./service-preset-types";
import { resolveVmbStorageBackend } from "@/lib/vmb/db";
import { getVmbServicePresetsFile } from "@/lib/vmb/paths";
import { readJsonArray, writeJsonArray } from "@/lib/vmb/runtime-json-store";
import { assertVmbWritableBackend, vmbProductionRequiresPostgres } from "@/lib/vmb/storage-policy";
import {
  listServicePresetOverridesPostgres,
  upsertServicePresetPostgres,
} from "./service-preset-store-postgres";

export const SERVICE_PRESET_POSTGRES_REQUIRED = "SERVICE_PRESET_POSTGRES_REQUIRED";

function isStoredPreset(item: unknown): item is ServicePresetCard {
  if (!item || typeof item !== "object") return false;
  const preset = item as ServicePresetCard;
  return typeof preset.id === "string" && typeof preset.serviceOfferId === "string";
}

async function listOverridesJson(): Promise<ServicePresetCard[]> {
  return readJsonArray(getVmbServicePresetsFile(), isStoredPreset);
}

async function listOverrides(): Promise<ServicePresetCard[]> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    return listServicePresetOverridesPostgres();
  }
  return listOverridesJson();
}

function mergePresetLayers(
  baseline: ServicePresetCard,
  override?: ServicePresetCard,
): ServicePresetCard {
  if (!override) return clonePresetCard(baseline);
  const addonById = new Map(baseline.addonPresets.map((addon) => [addon.addonId, addon]));
  for (const addon of override.addonPresets) {
    addonById.set(addon.addonId, addon);
  }
  return clonePresetCard({
    ...baseline,
    ...override,
    addonPresets: Array.from(addonById.values()).sort((a, b) => a.sortOrder - b.sortOrder),
  });
}

export async function listServicePresetCards(
  categoryId: ServiceCategoryId,
  options?: { includeInactive?: boolean },
): Promise<ServicePresetCard[]> {
  if (!getServiceCategory(categoryId)) return [];

  const baseline = listBaselinePresetsForCategory(categoryId);
  const overrides = await listOverrides();
  const overrideById = new Map(overrides.map((preset) => [preset.id, preset]));

  const merged = baseline.map((preset) => mergePresetLayers(preset, overrideById.get(preset.id)));

  if (options?.includeInactive) return merged.sort((a, b) => a.sortOrder - b.sortOrder);
  return merged.filter((preset) => preset.active).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getServicePresetCard(id: string): Promise<ServicePresetCard | undefined> {
  const overrides = await listOverrides();
  const override = overrides.find((preset) => preset.id === id);
  if (override) {
    const offer = getCatalogServiceOffer(override.serviceOfferId);
    if (!offer) return undefined;
    const baseline = listDefaultPresetsForCategory(offer.categoryId).find(
      (preset) => preset.id === id,
    );
    if (baseline) return mergePresetLayers(baseline, override);
    return clonePresetCard(override);
  }
  return undefined;
}

function validateAddonPresets(
  serviceOfferId: string,
  addonPresets: ServiceAddonPreset[],
): string | null {
  const allowed = new Set(listAddonsForServiceOffer(serviceOfferId).map((addon) => addon.id));
  for (const addon of addonPresets) {
    if (!allowed.has(addon.addonId)) {
      return `Add-on ${addon.addonId} is not allowed for ${serviceOfferId}`;
    }
  }
  return null;
}

export async function upsertServicePresetCard(
  input: ServicePresetCard,
): Promise<{ preset: ServicePresetCard } | { error: string }> {
  const offer = getCatalogServiceOffer(input.serviceOfferId);
  if (!offer) return { error: "Service offer not found in catalog" };
  if (offer.categoryId !== input.categoryId) {
    return { error: "Preset category does not match canonical offer category" };
  }
  if (!getServiceCategory(input.categoryId)) return { error: "Unknown category" };

  const addonError = validateAddonPresets(input.serviceOfferId, input.addonPresets);
  if (addonError) return { error: addonError };

  const baseline =
    listBaselinePresetsForCategory(input.categoryId).find((preset) => preset.id === input.id) ??
    listDefaultPresetsForCategory(input.categoryId).find((preset) => preset.id === input.id);

  const payload: ServicePresetCard = mergePresetLayers(baseline ?? input, {
    ...input,
    updatedAt: new Date().toISOString(),
  });

  const writable = await assertVmbWritableBackend();
  if (!writable.ok) {
    if (vmbProductionRequiresPostgres()) {
      return { error: SERVICE_PRESET_POSTGRES_REQUIRED };
    }
    return { error: writable.error };
  }

  if (writable.backend === "postgres") {
    const saved = await upsertServicePresetPostgres(payload);
    if ("error" in saved) {
      return vmbProductionRequiresPostgres() ? { error: SERVICE_PRESET_POSTGRES_REQUIRED } : saved;
    }
    return saved;
  }

  const all = await listOverridesJson();
  const others = all.filter((preset) => preset.id !== payload.id);
  await writeJsonArray(getVmbServicePresetsFile(), [...others, payload]);
  return { preset: payload };
}

export { listDefaultPresetsForCategory };
