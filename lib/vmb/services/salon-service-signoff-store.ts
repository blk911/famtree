import type { SalonServiceMenuSignoff, SalonServiceSignoffStatus } from "./service-preset-types";
import { resolveVmbStorageBackend } from "@/lib/vmb/db";
import { getVmbSalonServiceSignoffsFile } from "@/lib/vmb/paths";
import { readJsonArray, writeJsonArray } from "@/lib/vmb/runtime-json-store";
import { prisma } from "@/lib/vmb/db";

function isSignoff(item: unknown): item is SalonServiceMenuSignoff {
  if (!item || typeof item !== "object") return false;
  const row = item as SalonServiceMenuSignoff;
  return typeof row.salonId === "string" && typeof row.status === "string";
}

async function listSignoffsJson(): Promise<SalonServiceMenuSignoff[]> {
  return readJsonArray(getVmbSalonServiceSignoffsFile(), isSignoff);
}

/** Internal launch signoff — default pending until owner reviews menu. */
export async function getSalonServiceMenuSignoff(
  salonId: string,
): Promise<SalonServiceMenuSignoff> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    const rows = await prisma.$queryRaw<{ payload: unknown }[]>`
      SELECT payload FROM vmb_salon_service_signoff WHERE salon_id = ${salonId.trim()}
    `;
    const parsed = rows[0]?.payload as SalonServiceMenuSignoff | undefined;
    if (parsed?.status) return parsed;
  } else {
    const stored = (await listSignoffsJson()).find((row) => row.salonId === salonId);
    if (stored) return stored;
  }

  return {
    salonId,
    status: "pending",
    updatedAt: new Date(0).toISOString(),
  };
}

export async function setSalonServiceMenuSignoff(
  salonId: string,
  status: SalonServiceSignoffStatus,
): Promise<SalonServiceMenuSignoff> {
  const payload: SalonServiceMenuSignoff = {
    salonId,
    status,
    updatedAt: new Date().toISOString(),
  };

  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    await prisma.$executeRaw`
      INSERT INTO vmb_salon_service_signoff (salon_id, payload, updated_at)
      VALUES (${salonId.trim()}, ${JSON.stringify(payload)}::jsonb, ${payload.updatedAt}::timestamptz)
      ON CONFLICT (salon_id) DO UPDATE SET
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
    `;
  } else {
    const all = await listSignoffsJson();
    const others = all.filter((row) => row.salonId !== salonId);
    await writeJsonArray(getVmbSalonServiceSignoffsFile(), [...others, payload]);
  }

  return payload;
}
