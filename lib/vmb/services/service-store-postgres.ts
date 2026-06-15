import type { VmbServiceOption } from "@/lib/vmb/services/service-option-types";
import type { VmbService } from "@/lib/vmb/services/service-types";
import { prisma, resolveVmbStorageBackend } from "@/lib/vmb/db";

type ServiceRow = {
  id: string;
  salon_id: string | null;
  category: string;
  name: string;
  active: boolean;
  display_order: number;
  payload: unknown;
};

type OptionRow = {
  id: string;
  salon_id: string | null;
  service_id: string;
  name: string;
  active: boolean;
  display_order: number;
  payload: unknown;
};

function isService(item: unknown): item is VmbService {
  if (!item || typeof item !== "object") return false;
  const service = item as VmbService;
  return typeof service.id === "string" && typeof service.name === "string";
}

function isOption(item: unknown): item is VmbServiceOption {
  if (!item || typeof item !== "object") return false;
  const option = item as VmbServiceOption;
  return typeof option.id === "string" && typeof option.serviceId === "string";
}

function parseService(raw: unknown): VmbService | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    try {
      return parseService(JSON.parse(raw) as unknown);
    } catch {
      return undefined;
    }
  }
  return isService(raw) ? raw : undefined;
}

function parseOption(raw: unknown): VmbServiceOption | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    try {
      return parseOption(JSON.parse(raw) as unknown);
    } catch {
      return undefined;
    }
  }
  return isOption(raw) ? raw : undefined;
}

export async function listSalonServicesPostgres(salonId: string): Promise<VmbService[]> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return [];

  try {
    const rows = await prisma.$queryRaw<ServiceRow[]>`
      SELECT id, salon_id, category, name, active, display_order, payload
      FROM vmb_service
      WHERE salon_id = ${salonId.trim()}
      ORDER BY display_order ASC, name ASC
    `;
    return rows.map((row) => parseService(row.payload)).filter((s): s is VmbService => !!s);
  } catch {
    return [];
  }
}

export async function listSalonOptionsPostgres(salonId: string): Promise<VmbServiceOption[]> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return [];

  try {
    const rows = await prisma.$queryRaw<OptionRow[]>`
      SELECT id, salon_id, service_id, name, active, display_order, payload
      FROM vmb_service_option
      WHERE salon_id = ${salonId.trim()}
      ORDER BY display_order ASC, name ASC
    `;
    return rows.map((row) => parseOption(row.payload)).filter((o): o is VmbServiceOption => !!o);
  } catch {
    return [];
  }
}

export async function upsertSalonServicePostgres(
  salonId: string,
  service: VmbService,
): Promise<{ service: VmbService } | { error: string }> {
  if ((await resolveVmbStorageBackend()) !== "postgres") {
    return { error: "Postgres required for custom services" };
  }

  const id = service.id.startsWith("default-") ? `${salonId.trim()}-${service.id}` : service.id;
  const now = new Date().toISOString();
  const payload: VmbService = {
    ...service,
    id,
    salonId,
    isDefault: false,
    updatedAt: now,
    createdAt: service.createdAt || now,
  };

  try {
    await prisma.$executeRaw`
      INSERT INTO vmb_service (id, salon_id, category, name, active, display_order, payload, created_at, updated_at)
      VALUES (
        ${id},
        ${salonId.trim()},
        ${service.category},
        ${service.name},
        ${payload.active},
        ${payload.displayOrder},
        ${JSON.stringify(payload)}::jsonb,
        ${payload.createdAt}::timestamptz,
        ${now}::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        category = EXCLUDED.category,
        name = EXCLUDED.name,
        active = EXCLUDED.active,
        display_order = EXCLUDED.display_order,
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
    `;
    return { service: payload };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save service" };
  }
}

export async function upsertSalonOptionPostgres(
  salonId: string,
  option: VmbServiceOption,
): Promise<{ option: VmbServiceOption } | { error: string }> {
  if ((await resolveVmbStorageBackend()) !== "postgres") {
    return { error: "Postgres required for custom service options" };
  }

  const id = option.id.startsWith("default-") ? `${salonId.trim()}-${option.id}` : option.id;
  const now = new Date().toISOString();
  const payload: VmbServiceOption = {
    ...option,
    id,
    salonId,
    isDefault: false,
    updatedAt: now,
    createdAt: option.createdAt || now,
  };

  try {
    await prisma.$executeRaw`
      INSERT INTO vmb_service_option (id, salon_id, service_id, name, active, display_order, payload, created_at, updated_at)
      VALUES (
        ${id},
        ${salonId.trim()},
        ${option.serviceId},
        ${option.name},
        ${payload.active},
        ${payload.displayOrder},
        ${JSON.stringify(payload)}::jsonb,
        ${payload.createdAt}::timestamptz,
        ${now}::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        service_id = EXCLUDED.service_id,
        name = EXCLUDED.name,
        active = EXCLUDED.active,
        display_order = EXCLUDED.display_order,
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
    `;
    return { option: payload };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save service option" };
  }
}

export async function archiveSalonServicePostgres(
  salonId: string,
  serviceId: string,
): Promise<{ ok: true } | { error: string }> {
  if ((await resolveVmbStorageBackend()) !== "postgres") {
    return { error: "Postgres required for custom services" };
  }

  try {
    await prisma.$executeRaw`
      UPDATE vmb_service
      SET active = false, updated_at = now(),
          payload = jsonb_set(payload, '{active}', 'false'::jsonb, true)
      WHERE salon_id = ${salonId.trim()} AND id = ${serviceId.trim()}
    `;
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to archive service" };
  }
}

export async function archiveSalonOptionPostgres(
  salonId: string,
  optionId: string,
): Promise<{ ok: true } | { error: string }> {
  if ((await resolveVmbStorageBackend()) !== "postgres") {
    return { error: "Postgres required for custom service options" };
  }

  try {
    await prisma.$executeRaw`
      UPDATE vmb_service_option
      SET active = false, updated_at = now(),
          payload = jsonb_set(payload, '{active}', 'false'::jsonb, true)
      WHERE salon_id = ${salonId.trim()} AND id = ${optionId.trim()}
    `;
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to archive option" };
  }
}

export async function deleteAllSalonServicesPostgres(salonId: string): Promise<void> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return;

  try {
    await prisma.$executeRaw`DELETE FROM vmb_service_option WHERE salon_id = ${salonId.trim()}`;
    await prisma.$executeRaw`DELETE FROM vmb_service WHERE salon_id = ${salonId.trim()}`;
  } catch {
    // best effort
  }
}
