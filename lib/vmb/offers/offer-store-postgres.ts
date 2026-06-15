import type { VmbOffer, VmbOfferCategory } from "@/lib/vmb/offers/offer-types";
import { prisma, resolveVmbStorageBackend } from "@/lib/vmb/db";

type OfferRow = {
  id: string;
  salon_id: string | null;
  category: string;
  name: string;
  active: boolean;
  source: string | null;
  confidence: number | null;
  payload: unknown;
  created_at: Date;
  updated_at: Date;
};

function isVmbOffer(item: unknown): item is VmbOffer {
  if (!item || typeof item !== "object") return false;
  const offer = item as VmbOffer;
  return (
    typeof offer.id === "string" &&
    typeof offer.category === "string" &&
    typeof offer.name === "string" &&
    typeof offer.offerText === "string"
  );
}

function parsePayload(raw: unknown): VmbOffer | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    try {
      return parsePayload(JSON.parse(raw) as unknown);
    } catch {
      return undefined;
    }
  }
  return isVmbOffer(raw) ? raw : undefined;
}

export async function listSalonOffersPostgres(salonId: string): Promise<VmbOffer[]> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return [];

  try {
    const rows = await prisma.$queryRaw<OfferRow[]>`
      SELECT id, salon_id, category, name, active, source, confidence, payload, created_at, updated_at
      FROM vmb_offer
      WHERE salon_id = ${salonId.trim()}
      ORDER BY category ASC, updated_at DESC
    `;
    return rows
      .map((row) => parsePayload(row.payload))
      .filter((offer): offer is VmbOffer => !!offer);
  } catch {
    return [];
  }
}

export async function getSalonOfferByCategoryPostgres(
  salonId: string,
  category: VmbOfferCategory,
): Promise<VmbOffer | undefined> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return undefined;

  try {
    const rows = await prisma.$queryRaw<OfferRow[]>`
      SELECT id, salon_id, category, name, active, source, confidence, payload, created_at, updated_at
      FROM vmb_offer
      WHERE salon_id = ${salonId.trim()} AND category = ${category} AND active = true
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    const row = rows[0];
    return row ? parsePayload(row.payload) : undefined;
  } catch {
    return undefined;
  }
}

export async function upsertSalonOfferPostgres(
  salonId: string,
  offer: VmbOffer,
): Promise<{ offer: VmbOffer } | { error: string }> {
  if ((await resolveVmbStorageBackend()) !== "postgres") {
    return { error: "Postgres required for custom offers" };
  }

  const id = offer.id.startsWith("default-") ? `${salonId.trim()}-${offer.category}` : offer.id;
  const now = new Date().toISOString();
  const payload: VmbOffer = {
    ...offer,
    id,
    salonId,
    isDefault: false,
    active: offer.active !== false,
    updatedAt: now,
    createdAt: offer.createdAt || now,
  };

  try {
    await prisma.$executeRaw`
      INSERT INTO vmb_offer (id, salon_id, category, name, active, source, confidence, payload, created_at, updated_at)
      VALUES (
        ${id},
        ${salonId.trim()},
        ${offer.category},
        ${offer.name},
        ${payload.active},
        ${payload.source ?? "manual"},
        ${payload.confidence ?? null},
        ${JSON.stringify(payload)}::jsonb,
        ${payload.createdAt}::timestamptz,
        ${now}::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        category = EXCLUDED.category,
        name = EXCLUDED.name,
        active = EXCLUDED.active,
        source = EXCLUDED.source,
        confidence = EXCLUDED.confidence,
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
    `;
    return { offer: payload };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save offer" };
  }
}

export async function archiveSalonOfferPostgres(
  salonId: string,
  offerId: string,
): Promise<{ ok: true } | { error: string }> {
  if ((await resolveVmbStorageBackend()) !== "postgres") {
    return { error: "Postgres required for custom offers" };
  }

  try {
    await prisma.$executeRaw`
      UPDATE vmb_offer
      SET active = false, updated_at = now(),
          payload = jsonb_set(payload, '{active}', 'false'::jsonb, true)
      WHERE salon_id = ${salonId.trim()} AND id = ${offerId.trim()}
    `;
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to archive offer" };
  }
}

export async function deleteAllSalonOffersPostgres(salonId: string): Promise<void> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return;

  try {
    await prisma.$executeRaw`
      DELETE FROM vmb_offer WHERE salon_id = ${salonId.trim()}
    `;
  } catch {
    // best effort for tests
  }
}
