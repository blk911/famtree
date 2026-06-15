import { resolveVmbStorageBackend } from "@/lib/vmb/db";
import { getVmbServiceOptionsFile, getVmbServicesFile } from "@/lib/vmb/paths";
import { readJsonArray, writeJsonArray } from "@/lib/vmb/runtime-json-store";
import { assertVmbWritableBackend, vmbJsonFallbackAllowed, vmbProductionRequiresPostgres } from "@/lib/vmb/storage-policy";
import {
  getAllDefaultServiceOptions,
  getAllDefaultServices,
  getDefaultOptionsForService,
} from "./default-service-catalog";
import type { VmbServiceOption } from "./service-option-types";
import type { VmbService } from "./service-types";
import {
  archiveSalonOptionPostgres,
  archiveSalonServicePostgres,
  deleteAllSalonServicesPostgres,
  listSalonOptionsPostgres,
  listSalonServicesPostgres,
  upsertSalonOptionPostgres,
  upsertSalonServicePostgres,
} from "./service-store-postgres";

export const SERVICE_POSTGRES_REQUIRED = "SERVICE_POSTGRES_REQUIRED";

type StoredService = { salonId: string; service: VmbService };
type StoredOption = { salonId: string; option: VmbServiceOption };

function isStoredService(item: unknown): item is StoredService {
  if (!item || typeof item !== "object") return false;
  const row = item as StoredService;
  return typeof row.salonId === "string" && !!row.service?.id;
}

function isStoredOption(item: unknown): item is StoredOption {
  if (!item || typeof item !== "object") return false;
  const row = item as StoredOption;
  return typeof row.salonId === "string" && !!row.option?.id;
}

async function listServicesJson(): Promise<StoredService[]> {
  return readJsonArray(getVmbServicesFile(), isStoredService);
}

async function listOptionsJson(): Promise<StoredOption[]> {
  return readJsonArray(getVmbServiceOptionsFile(), isStoredOption);
}

async function assertServiceWritable(): Promise<
  { ok: true; backend: "postgres" | "json" } | { error: string }
> {
  const writable = await assertVmbWritableBackend();
  if (!writable.ok) {
    if (vmbProductionRequiresPostgres()) {
      return { error: SERVICE_POSTGRES_REQUIRED };
    }
    return { error: writable.error };
  }
  return { ok: true, backend: writable.backend };
}

const DEFAULT_ID_SET = new Set(getAllDefaultServices().map((service) => service.id));

function normalizeDefaultId(id: string): string {
  const match = id.match(/^[a-z0-9-]+-(default-.+)$/i);
  return match?.[1] ?? id;
}

function mergeServices(salonId: string, customs: VmbService[]): VmbService[] {
  const overrideByBaseId = new Map<string, VmbService>();
  const extras: VmbService[] = [];

  for (const service of customs) {
    if (!service.active && service.isDefault === false) continue;
    const baseId = normalizeDefaultId(service.id);
    if (baseId.startsWith("default-") || DEFAULT_ID_SET.has(baseId)) {
      overrideByBaseId.set(baseId, { ...service, salonId, isDefault: false });
    } else {
      extras.push({ ...service, salonId, isDefault: false });
    }
  }

  const merged = getAllDefaultServices().map((defaults) => {
    const override = overrideByBaseId.get(defaults.id);
    if (!override) return { ...defaults };
    return { ...defaults, ...override, id: override.id };
  });

  for (const extra of extras) {
    if (!merged.some((service) => service.id === extra.id)) {
      merged.push(extra);
    }
  }

  return merged.filter((service) => service.active).sort((a, b) => a.displayOrder - b.displayOrder);
}

function mergeOptions(salonId: string, serviceId: string, customs: VmbServiceOption[]): VmbServiceOption[] {
  const baseServiceId = normalizeDefaultId(serviceId);
  const overrideByBaseId = new Map<string, VmbServiceOption>();
  const extras: VmbServiceOption[] = [];

  for (const option of customs) {
    if (option.serviceId !== serviceId && normalizeDefaultId(option.serviceId) !== baseServiceId) continue;
    if (!option.active && option.isDefault === false) continue;
    const baseId = normalizeDefaultId(option.id);
    if (baseId.startsWith("default-")) {
      overrideByBaseId.set(baseId, { ...option, salonId, isDefault: false });
    } else {
      extras.push({ ...option, salonId, isDefault: false });
    }
  }

  const merged = getDefaultOptionsForService(baseServiceId).map((defaults) => {
    const override = overrideByBaseId.get(defaults.id);
    if (!override) return { ...defaults };
    return { ...defaults, ...override, id: override.id, serviceId };
  });

  for (const extra of extras) {
    if (!merged.some((option) => option.id === extra.id)) {
      merged.push({ ...extra, serviceId });
    }
  }

  return merged.filter((option) => option.active).sort((a, b) => a.displayOrder - b.displayOrder);
}

async function loadSalonServices(salonId: string): Promise<VmbService[]> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    return listSalonServicesPostgres(salonId);
  }
  const all = await listServicesJson();
  return all.filter((row) => row.salonId === salonId).map((row) => row.service);
}

async function loadSalonOptions(salonId: string): Promise<VmbServiceOption[]> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    return listSalonOptionsPostgres(salonId);
  }
  const all = await listOptionsJson();
  return all.filter((row) => row.salonId === salonId).map((row) => row.option);
}

export async function getServicesForSalon(salonId: string): Promise<VmbService[]> {
  const customs = await loadSalonServices(salonId);
  return mergeServices(salonId, customs);
}

export async function getOptionsForService(
  salonId: string,
  serviceId: string,
): Promise<VmbServiceOption[]> {
  const customs = await loadSalonOptions(salonId);
  return mergeOptions(salonId, serviceId, customs);
}

export async function getAllOptionsForSalon(salonId: string): Promise<VmbServiceOption[]> {
  const customs = await loadSalonOptions(salonId);
  const services = await getServicesForSalon(salonId);
  const all: VmbServiceOption[] = [];
  for (const service of services) {
    all.push(...mergeOptions(salonId, service.id, customs));
  }
  return all;
}

export async function upsertService(
  salonId: string,
  service: VmbService,
): Promise<{ service: VmbService } | { error: string }> {
  const writable = await assertServiceWritable();
  if ("error" in writable) return writable;

  const payload: VmbService = {
    ...service,
    salonId,
    isDefault: false,
    updatedAt: new Date().toISOString(),
  };

  if (writable.backend === "postgres") {
    const saved = await upsertSalonServicePostgres(salonId, payload);
    if ("error" in saved) {
      return vmbProductionRequiresPostgres() ? { error: SERVICE_POSTGRES_REQUIRED } : saved;
    }
    if (vmbJsonFallbackAllowed()) {
      await persistServiceJson(salonId, saved.service);
    }
    return saved;
  }

  const id = payload.id.startsWith("default-") ? `${salonId}-${payload.id}` : payload.id;
  payload.id = id;
  await persistServiceJson(salonId, payload);
  return { service: payload };
}

export async function upsertServiceOption(
  salonId: string,
  option: VmbServiceOption,
): Promise<{ option: VmbServiceOption } | { error: string }> {
  const writable = await assertServiceWritable();
  if ("error" in writable) return writable;

  const payload: VmbServiceOption = {
    ...option,
    salonId,
    isDefault: false,
    updatedAt: new Date().toISOString(),
  };

  if (writable.backend === "postgres") {
    const saved = await upsertSalonOptionPostgres(salonId, payload);
    if ("error" in saved) {
      return vmbProductionRequiresPostgres() ? { error: SERVICE_POSTGRES_REQUIRED } : saved;
    }
    if (vmbJsonFallbackAllowed()) {
      await persistOptionJson(salonId, saved.option);
    }
    return saved;
  }

  const id = payload.id.startsWith("default-") ? `${salonId}-${payload.id}` : payload.id;
  payload.id = id;
  await persistOptionJson(salonId, payload);
  return { option: payload };
}

async function persistServiceJson(salonId: string, service: VmbService): Promise<void> {
  const all = await listServicesJson();
  const others = all.filter((row) => !(row.salonId === salonId && row.service.id === service.id));
  await writeJsonArray(getVmbServicesFile(), [...others, { salonId, service }]);
}

async function persistOptionJson(salonId: string, option: VmbServiceOption): Promise<void> {
  const all = await listOptionsJson();
  const others = all.filter((row) => !(row.salonId === salonId && row.option.id === option.id));
  await writeJsonArray(getVmbServiceOptionsFile(), [...others, { salonId, option }]);
}

export async function archiveService(
  salonId: string,
  serviceId: string,
): Promise<{ ok: true } | { error: string }> {
  if (serviceId.startsWith("default-") && !serviceId.includes(salonId)) {
    const writable = await assertServiceWritable();
    if ("error" in writable) return writable;
    const base = getAllDefaultServices().find((service) => service.id === serviceId);
    if (!base) return { error: "Service not found" };
    const inactive = { ...base, active: false };
    const saved = await upsertService(salonId, inactive);
    if ("error" in saved) return saved;
    return { ok: true };
  }

  const writable = await assertServiceWritable();
  if ("error" in writable) return writable;

  if (writable.backend === "postgres") {
    const archived = await archiveSalonServicePostgres(salonId, serviceId);
    if ("error" in archived) {
      return vmbProductionRequiresPostgres() ? { error: SERVICE_POSTGRES_REQUIRED } : archived;
    }
    if (vmbJsonFallbackAllowed()) {
      const all = await listServicesJson();
      const next = all.map((row) =>
        row.salonId === salonId && row.service.id === serviceId
          ? { salonId, service: { ...row.service, active: false } }
          : row,
      );
      await writeJsonArray(getVmbServicesFile(), next);
    }
    return { ok: true };
  }

  const all = await listServicesJson();
  const next = all.map((row) =>
    row.salonId === salonId && row.service.id === serviceId
      ? { salonId, service: { ...row.service, active: false } }
      : row,
  );
  const err = await writeJsonArray(getVmbServicesFile(), next);
  if (err) return { error: err };
  return { ok: true };
}

export async function archiveOption(
  salonId: string,
  optionId: string,
): Promise<{ ok: true } | { error: string }> {
  const baseId = normalizeDefaultId(optionId);
  if (baseId.startsWith("default-") && !optionId.includes(salonId)) {
    const base = getAllDefaultServiceOptions().find((option) => option.id === baseId);
    if (!base) return { error: "Option not found" };
    const saved = await upsertServiceOption(salonId, { ...base, active: false });
    if ("error" in saved) return saved;
    return { ok: true };
  }

  const writable = await assertServiceWritable();
  if ("error" in writable) return writable;

  if (writable.backend === "postgres") {
    const archived = await archiveSalonOptionPostgres(salonId, optionId);
    if ("error" in archived) {
      return vmbProductionRequiresPostgres() ? { error: SERVICE_POSTGRES_REQUIRED } : archived;
    }
    if (vmbJsonFallbackAllowed()) {
      const all = await listOptionsJson();
      const next = all.map((row) =>
        row.salonId === salonId && row.option.id === optionId
          ? { salonId, option: { ...row.option, active: false } }
          : row,
      );
      await writeJsonArray(getVmbServiceOptionsFile(), next);
    }
    return { ok: true };
  }

  const all = await listOptionsJson();
  const next = all.map((row) =>
    row.salonId === salonId && row.option.id === optionId
      ? { salonId, option: { ...row.option, active: false } }
      : row,
  );
  const err = await writeJsonArray(getVmbServiceOptionsFile(), next);
  if (err) return { error: err };
  return { ok: true };
}

export async function clearSalonServices(salonId: string): Promise<void> {
  await deleteAllSalonServicesPostgres(salonId);
  if (vmbJsonFallbackAllowed()) {
    const services = await listServicesJson();
    const options = await listOptionsJson();
    await writeJsonArray(
      getVmbServicesFile(),
      services.filter((row) => row.salonId !== salonId),
    );
    await writeJsonArray(
      getVmbServiceOptionsFile(),
      options.filter((row) => row.salonId !== salonId),
    );
  }
}

export {
  getAllDefaultServices,
  getAllDefaultServiceOptions,
  getDefaultOptionsForService,
  getDefaultService,
} from "./default-service-catalog";
