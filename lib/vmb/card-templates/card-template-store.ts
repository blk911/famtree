import type { VmbCardType } from "@/lib/vmb/cards/card-types";
import { resolveVmbStorageBackend } from "@/lib/vmb/db";
import { getVmbCardTemplatesFile } from "@/lib/vmb/paths";
import { readJsonArray, writeJsonArray } from "@/lib/vmb/runtime-json-store";
import { assertVmbWritableBackend, vmbJsonFallbackAllowed, vmbProductionRequiresPostgres } from "@/lib/vmb/storage-policy";
import type { VmbCardTemplate } from "./card-template-types";
import { getAllDefaultTemplates, getDefaultTemplate } from "./default-card-templates";
import {
  deleteAllTemplateOverridesForSalonPostgres,
  deleteTemplateOverridePostgres,
  getTemplateOverrideForTypePostgres,
  listTemplateOverridesForSalonPostgres,
  upsertTemplateOverridePostgres,
} from "./card-template-store-postgres";

export const CARD_TEMPLATE_POSTGRES_REQUIRED = "CARD_TEMPLATE_POSTGRES_REQUIRED";

type StoredOverride = {
  salonId: string;
  template: VmbCardTemplate;
};

function isStoredOverride(item: unknown): item is StoredOverride {
  if (!item || typeof item !== "object") return false;
  const row = item as StoredOverride;
  return typeof row.salonId === "string" && !!row.template && typeof row.template.type === "string";
}

async function listOverridesJson(): Promise<StoredOverride[]> {
  return readJsonArray(getVmbCardTemplatesFile(), isStoredOverride);
}

async function assertTemplateWritable(): Promise<
  { ok: true; backend: "postgres" | "json" } | { error: string }
> {
  const writable = await assertVmbWritableBackend();
  if (!writable.ok) {
    if (vmbProductionRequiresPostgres()) {
      return { error: CARD_TEMPLATE_POSTGRES_REQUIRED };
    }
    return { error: writable.error };
  }
  return { ok: true, backend: writable.backend };
}

function mergeTemplatesForSalon(
  salonId: string,
  overrides: VmbCardTemplate[],
): VmbCardTemplate[] {
  const overrideByType = new Map(overrides.map((template) => [template.type, template]));
  return getAllDefaultTemplates().map((defaults) => {
    const override = overrideByType.get(defaults.type);
    if (!override) return { ...defaults };
    return {
      ...defaults,
      ...override,
      id: override.id || `${salonId}-${defaults.type}`,
      salonId,
      isDefault: false,
    };
  });
}

export async function getTemplatesForSalon(salonId: string): Promise<VmbCardTemplate[]> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    const overrides = await listTemplateOverridesForSalonPostgres(salonId);
    return mergeTemplatesForSalon(salonId, overrides);
  }

  const all = await listOverridesJson();
  const overrides = all.filter((row) => row.salonId === salonId).map((row) => row.template);
  return mergeTemplatesForSalon(salonId, overrides);
}

export async function getTemplateForType(
  salonId: string,
  type: VmbCardType,
): Promise<VmbCardTemplate> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    const override = await getTemplateOverrideForTypePostgres(salonId, type);
    if (override) {
      return {
        ...getDefaultTemplate(type),
        ...override,
        id: override.id || `${salonId}-${type}`,
        salonId,
        isDefault: false,
      };
    }
    return getDefaultTemplate(type);
  }

  const all = await listOverridesJson();
  const override = all.find((row) => row.salonId === salonId && row.template.type === type)?.template;
  if (override) {
    return {
      ...getDefaultTemplate(type),
      ...override,
      id: override.id || `${salonId}-${type}`,
      salonId,
      isDefault: false,
    };
  }
  return getDefaultTemplate(type);
}

export function getTemplateForTypeSync(type: VmbCardType): VmbCardTemplate {
  return getDefaultTemplate(type);
}

export async function upsertTemplateOverride(
  salonId: string,
  template: VmbCardTemplate,
): Promise<{ template: VmbCardTemplate } | { error: string }> {
  const writable = await assertTemplateWritable();
  if ("error" in writable) return writable;

  const payload: VmbCardTemplate = {
    ...template,
    salonId,
    isDefault: false,
    updatedAt: new Date().toISOString(),
  };

  if (writable.backend === "postgres") {
    const saved = await upsertTemplateOverridePostgres(salonId, payload);
    if ("error" in saved) {
      return vmbProductionRequiresPostgres()
        ? { error: CARD_TEMPLATE_POSTGRES_REQUIRED }
        : saved;
    }
    if (vmbJsonFallbackAllowed()) {
      const all = await listOverridesJson();
      const others = all.filter(
        (row) => !(row.salonId === salonId && row.template.type === template.type),
      );
      await writeJsonArray(getVmbCardTemplatesFile(), [...others, { salonId, template: saved.template }]);
    }
    return saved;
  }

  const all = await listOverridesJson();
  const others = all.filter(
    (row) => !(row.salonId === salonId && row.template.type === template.type),
  );
  const err = await writeJsonArray(getVmbCardTemplatesFile(), [
    ...others,
    { salonId, template: payload },
  ]);
  if (err) {
    return vmbProductionRequiresPostgres() ? { error: CARD_TEMPLATE_POSTGRES_REQUIRED } : { error: err };
  }
  return { template: payload };
}

export async function resetTemplateToDefault(
  salonId: string,
  type: VmbCardType,
): Promise<{ template: VmbCardTemplate } | { error: string }> {
  const writable = await assertTemplateWritable();
  if ("error" in writable) return writable;

  if (writable.backend === "postgres") {
    const deleted = await deleteTemplateOverridePostgres(salonId, type);
    if ("error" in deleted) {
      return vmbProductionRequiresPostgres()
        ? { error: CARD_TEMPLATE_POSTGRES_REQUIRED }
        : deleted;
    }
    if (vmbJsonFallbackAllowed()) {
      const all = await listOverridesJson();
      const next = all.filter((row) => !(row.salonId === salonId && row.template.type === type));
      await writeJsonArray(getVmbCardTemplatesFile(), next);
    }
    return { template: getDefaultTemplate(type) };
  }

  const all = await listOverridesJson();
  const next = all.filter((row) => !(row.salonId === salonId && row.template.type === type));
  const err = await writeJsonArray(getVmbCardTemplatesFile(), next);
  if (err) {
    return vmbProductionRequiresPostgres() ? { error: CARD_TEMPLATE_POSTGRES_REQUIRED } : { error: err };
  }
  return { template: getDefaultTemplate(type) };
}

/** Test helper — clears salon overrides. */
export async function clearSalonTemplateOverrides(salonId: string): Promise<void> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    await deleteAllTemplateOverridesForSalonPostgres(salonId);
  }
  if (vmbJsonFallbackAllowed()) {
    const all = await listOverridesJson();
    await writeJsonArray(
      getVmbCardTemplatesFile(),
      all.filter((row) => row.salonId !== salonId),
    );
  }
}

export { getAllDefaultTemplates, getDefaultTemplate };
