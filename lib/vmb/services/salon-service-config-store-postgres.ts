import type { SalonServiceConfig } from "./canonical-catalog-types";
import { prisma, resolveVmbStorageBackend } from "@/lib/vmb/db";

type ConfigRow = {
  payload: unknown;
};

function parseConfig(raw: unknown): SalonServiceConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const config = raw as SalonServiceConfig;
  if (typeof config.catalogServiceId !== "string") return null;
  return config;
}

export async function listSalonServiceConfigsPostgres(salonId: string): Promise<SalonServiceConfig[]> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return [];
  try {
    const rows = await prisma.$queryRaw<ConfigRow[]>`
      SELECT payload FROM vmb_salon_service_config WHERE salon_id = ${salonId.trim()}
    `;
    return rows.map((row) => parseConfig(row.payload)).filter((config): config is SalonServiceConfig => Boolean(config));
  } catch {
    return [];
  }
}

export async function upsertSalonServiceConfigPostgres(
  salonId: string,
  config: SalonServiceConfig,
): Promise<{ config: SalonServiceConfig } | { error: string }> {
  if ((await resolveVmbStorageBackend()) !== "postgres") {
    return { error: "Postgres required for salon service config" };
  }

  try {
    await prisma.$executeRaw`
      INSERT INTO vmb_salon_service_config (salon_id, catalog_service_id, payload, updated_at)
      VALUES (
        ${salonId.trim()},
        ${config.catalogServiceId},
        ${JSON.stringify(config)}::jsonb,
        ${config.updatedAt}::timestamptz
      )
      ON CONFLICT (salon_id, catalog_service_id) DO UPDATE SET
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
    `;
    return { config };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save salon service config" };
  }
}

export async function deleteAllSalonServiceConfigsPostgres(salonId: string): Promise<void> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return;
  await prisma.$executeRaw`
    DELETE FROM vmb_salon_service_config WHERE salon_id = ${salonId.trim()}
  `;
}
