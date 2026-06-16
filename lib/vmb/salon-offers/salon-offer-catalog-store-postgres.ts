import type { SalonOfferCatalogEntry } from "./salon-offer-catalog-types";
import { prisma, resolveVmbStorageBackend } from "@/lib/vmb/db";

type OfferRow = {
  payload: unknown;
};

function parseEntry(raw: unknown): SalonOfferCatalogEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as SalonOfferCatalogEntry;
  if (typeof entry.id !== "string" || typeof entry.salonId !== "string") return null;
  if (typeof entry.serviceId !== "string") return null;
  return entry;
}

export async function listSalonOfferCatalogPostgres(
  salonId: string,
): Promise<SalonOfferCatalogEntry[]> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return [];
  try {
    const rows = await prisma.$queryRaw<OfferRow[]>`
      SELECT payload FROM vmb_salon_offer_catalog WHERE salon_id = ${salonId.trim()}
      ORDER BY (payload->>'createdAt') DESC
    `;
    return rows
      .map((row) => parseEntry(row.payload))
      .filter((entry): entry is SalonOfferCatalogEntry => Boolean(entry));
  } catch {
    return [];
  }
}

export async function getSalonOfferCatalogEntryPostgres(
  salonId: string,
  offerId: string,
): Promise<SalonOfferCatalogEntry | undefined> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return undefined;
  try {
    const rows = await prisma.$queryRaw<OfferRow[]>`
      SELECT payload FROM vmb_salon_offer_catalog
      WHERE salon_id = ${salonId.trim()} AND offer_id = ${offerId.trim()}
      LIMIT 1
    `;
    const parsed = parseEntry(rows[0]?.payload);
    return parsed ?? undefined;
  } catch {
    return undefined;
  }
}

export async function upsertSalonOfferCatalogPostgres(
  entry: SalonOfferCatalogEntry,
): Promise<{ entry: SalonOfferCatalogEntry } | { error: string }> {
  if ((await resolveVmbStorageBackend()) !== "postgres") {
    return { error: "Postgres required for salon offer catalog" };
  }
  try {
    await prisma.$executeRaw`
      INSERT INTO vmb_salon_offer_catalog (salon_id, offer_id, payload, updated_at)
      VALUES (
        ${entry.salonId.trim()},
        ${entry.id},
        ${JSON.stringify(entry)}::jsonb,
        ${entry.updatedAt}::timestamptz
      )
      ON CONFLICT (salon_id, offer_id) DO UPDATE SET
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
    `;
    return { entry };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save salon offer" };
  }
}

export async function deleteSalonOfferCatalogPostgres(
  salonId: string,
  offerId: string,
): Promise<void> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return;
  try {
    await prisma.$executeRaw`
      DELETE FROM vmb_salon_offer_catalog
      WHERE salon_id = ${salonId.trim()} AND offer_id = ${offerId.trim()}
    `;
  } catch {
    // ignore
  }
}
