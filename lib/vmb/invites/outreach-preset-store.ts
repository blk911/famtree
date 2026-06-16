import { resolveVmbStorageBackend } from "@/lib/vmb/db";
import { getVmbOutreachPresetsFile } from "@/lib/vmb/paths";
import { readJsonArray, writeJsonArray } from "@/lib/vmb/runtime-json-store";
import { assertVmbWritableBackend, vmbJsonFallbackAllowed, vmbProductionRequiresPostgres } from "@/lib/vmb/storage-policy";
import type { InviteDraftCategory } from "@/types/vmb/invite-draft";
import {
  getDefaultOutreachPreset,
  listOutreachMessagePresets,
  type OutreachMessagePreset,
  type OutreachMessagePresetId,
  type OutreachTemplateVars,
  buildOutreachDraftCopyFromPreset,
} from "./outreach-message-presets";
import type { SalonOutreachPreset, UpsertOutreachPresetInput } from "./outreach-preset-types";

export const OUTREACH_PRESET_POSTGRES_REQUIRED = "OUTREACH_PRESET_POSTGRES_REQUIRED";

type StoredOutreachPreset = {
  salonId: string;
  preset: SalonOutreachPreset;
};

function isStoredOutreachPreset(item: unknown): item is StoredOutreachPreset {
  if (!item || typeof item !== "object") return false;
  const row = item as StoredOutreachPreset;
  return typeof row.salonId === "string" && !!row.preset && typeof row.preset.id === "string";
}

async function listStoredJson(): Promise<StoredOutreachPreset[]> {
  return readJsonArray(getVmbOutreachPresetsFile(), isStoredOutreachPreset);
}

async function assertOutreachPresetWritable(): Promise<
  { ok: true; backend: "postgres" | "json" } | { error: string }
> {
  const writable = await assertVmbWritableBackend();
  if (!writable.ok) {
    if (vmbProductionRequiresPostgres()) {
      return { error: OUTREACH_PRESET_POSTGRES_REQUIRED };
    }
    return { error: writable.error };
  }
  return { ok: true, backend: writable.backend };
}

function defaultSalonPreset(id: OutreachMessagePresetId): SalonOutreachPreset {
  const defaults = getDefaultOutreachPreset(id);
  return {
    ...defaults,
    active: true,
    isDefault: true,
    updatedAt: defaults.updatedAt ?? new Date(0).toISOString(),
  };
}

function mergePreset(defaults: OutreachMessagePreset, override?: SalonOutreachPreset): SalonOutreachPreset {
  if (!override) {
    return {
      ...defaults,
      active: true,
      isDefault: true,
      updatedAt: new Date(0).toISOString(),
    };
  }
  return {
    ...defaults,
    ...override,
    id: defaults.id,
    isDefault: false,
  };
}

function mergePresetsForSalon(salonId: string, overrides: SalonOutreachPreset[]): SalonOutreachPreset[] {
  const overrideById = new Map(overrides.map((preset) => [preset.id, preset]));
  return listOutreachMessagePresets().map((defaults) => {
    const override = overrideById.get(defaults.id);
    if (!override) return defaultSalonPreset(defaults.id);
    return mergePreset(defaults, { ...override, salonId });
  });
}

export async function getOutreachPresetsForSalon(salonId: string): Promise<SalonOutreachPreset[]> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    // Postgres module not required for this preset layer yet — JSON fallback when allowed.
  }

  const all = await listStoredJson();
  const overrides = all.filter((row) => row.salonId === salonId).map((row) => row.preset);
  return mergePresetsForSalon(salonId, overrides);
}

/** Active override wins; inactive override falls back to canonical default. */
export async function getActiveOutreachPresetForCategory(
  salonId: string,
  category: InviteDraftCategory,
): Promise<SalonOutreachPreset> {
  const presets = await getOutreachPresetsForSalon(salonId);
  const resolved = presets.find((preset) => preset.id === category);
  if (resolved && !resolved.isDefault && !resolved.active) {
    return defaultSalonPreset(category);
  }
  return resolved ?? defaultSalonPreset(category);
}

export async function buildOutreachDraftCopyForSalon(
  salonId: string,
  category: InviteDraftCategory,
  vars: OutreachTemplateVars,
) {
  const preset = await getActiveOutreachPresetForCategory(salonId, category);
  return buildOutreachDraftCopyFromPreset(preset, vars);
}

export async function upsertOutreachPresetOverride(
  salonId: string,
  input: UpsertOutreachPresetInput,
): Promise<{ preset: SalonOutreachPreset } | { error: string }> {
  const writable = await assertOutreachPresetWritable();
  if ("error" in writable) return writable;

  const defaults = getDefaultOutreachPreset(input.id);
  const existing = (await getOutreachPresetsForSalon(salonId)).find((preset) => preset.id === input.id);
  const base = existing && !existing.isDefault ? existing : mergePreset(defaults, undefined);

  const payload: SalonOutreachPreset = {
    ...base,
    ...defaults,
    ...input,
    id: input.id,
    salonId,
    active: input.active ?? base.active ?? true,
    isDefault: false,
    updatedAt: new Date().toISOString(),
  };

  const all = await listStoredJson();
  const others = all.filter((row) => !(row.salonId === salonId && row.preset.id === input.id));
  const err = await writeJsonArray(getVmbOutreachPresetsFile(), [...others, { salonId, preset: payload }]);
  if (err) {
    return vmbProductionRequiresPostgres() ? { error: OUTREACH_PRESET_POSTGRES_REQUIRED } : { error: err };
  }
  return { preset: payload };
}

export async function resetOutreachPresetToDefault(
  salonId: string,
  id: OutreachMessagePresetId,
): Promise<{ preset: SalonOutreachPreset } | { error: string }> {
  const writable = await assertOutreachPresetWritable();
  if ("error" in writable) return writable;

  const all = await listStoredJson();
  const next = all.filter((row) => !(row.salonId === salonId && row.preset.id === id));
  const err = await writeJsonArray(getVmbOutreachPresetsFile(), next);
  if (err) {
    return vmbProductionRequiresPostgres() ? { error: OUTREACH_PRESET_POSTGRES_REQUIRED } : { error: err };
  }
  return { preset: defaultSalonPreset(id) };
}

/** Test helper — clears salon outreach overrides. */
export async function clearSalonOutreachPresets(salonId: string): Promise<void> {
  if (vmbJsonFallbackAllowed()) {
    const all = await listStoredJson();
    await writeJsonArray(
      getVmbOutreachPresetsFile(),
      all.filter((row) => row.salonId !== salonId),
    );
  }
}
