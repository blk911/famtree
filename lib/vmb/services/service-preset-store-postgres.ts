import type { ServicePresetCard } from "./service-preset-types";
import { prisma, resolveVmbStorageBackend } from "@/lib/vmb/db";

type PresetRow = {
  payload: unknown;
};

function parsePreset(raw: unknown): ServicePresetCard | null {
  if (!raw || typeof raw !== "object") return null;
  const preset = raw as ServicePresetCard;
  if (typeof preset.id !== "string" || typeof preset.serviceOfferId !== "string") return null;
  return preset;
}

export async function listServicePresetOverridesPostgres(): Promise<ServicePresetCard[]> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return [];
  try {
    const rows = await prisma.$queryRaw<PresetRow[]>`
      SELECT payload FROM vmb_service_preset
    `;
    return rows.map((row) => parsePreset(row.payload)).filter((preset): preset is ServicePresetCard => Boolean(preset));
  } catch {
    return [];
  }
}

export async function upsertServicePresetPostgres(
  preset: ServicePresetCard,
): Promise<{ preset: ServicePresetCard } | { error: string }> {
  if ((await resolveVmbStorageBackend()) !== "postgres") {
    return { error: "Postgres required for service preset storage" };
  }

  try {
    await prisma.$executeRaw`
      INSERT INTO vmb_service_preset (id, payload, updated_at)
      VALUES (
        ${preset.id},
        ${JSON.stringify(preset)}::jsonb,
        ${preset.updatedAt ?? new Date().toISOString()}::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
    `;
    return { preset };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save service preset" };
  }
}
