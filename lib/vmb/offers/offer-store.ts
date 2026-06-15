import { resolveVmbStorageBackend } from "@/lib/vmb/db";
import { getVmbOffersFile } from "@/lib/vmb/paths";
import { readJsonArray, writeJsonArray } from "@/lib/vmb/runtime-json-store";
import { assertVmbWritableBackend, vmbJsonFallbackAllowed, vmbProductionRequiresPostgres } from "@/lib/vmb/storage-policy";
import { getAllDefaultOffers, getDefaultOfferForCategory } from "./default-offers";
import type { VmbOffer, VmbOfferCategory } from "./offer-types";
import {
  archiveSalonOfferPostgres,
  deleteAllSalonOffersPostgres,
  getSalonOfferByCategoryPostgres,
  listSalonOffersPostgres,
  upsertSalonOfferPostgres,
} from "./offer-store-postgres";

export const OFFER_POSTGRES_REQUIRED = "OFFER_POSTGRES_REQUIRED";

type StoredOffer = {
  salonId: string;
  offer: VmbOffer;
};

function isStoredOffer(item: unknown): item is StoredOffer {
  if (!item || typeof item !== "object") return false;
  const row = item as StoredOffer;
  return typeof row.salonId === "string" && !!row.offer && typeof row.offer.category === "string";
}

async function listOffersJson(): Promise<StoredOffer[]> {
  return readJsonArray(getVmbOffersFile(), isStoredOffer);
}

async function assertOfferWritable(): Promise<
  { ok: true; backend: "postgres" | "json" } | { error: string }
> {
  const writable = await assertVmbWritableBackend();
  if (!writable.ok) {
    if (vmbProductionRequiresPostgres()) {
      return { error: OFFER_POSTGRES_REQUIRED };
    }
    return { error: writable.error };
  }
  return { ok: true, backend: writable.backend };
}

function mergeOffersForSalon(salonId: string, customs: VmbOffer[]): VmbOffer[] {
  const customByCategory = new Map<VmbOfferCategory, VmbOffer>();
  for (const offer of customs) {
    if (!offer.active) continue;
    customByCategory.set(offer.category, {
      ...offer,
      salonId,
      isDefault: false,
    });
  }

  const merged = getAllDefaultOffers().map((defaults) => {
    const custom = customByCategory.get(defaults.category);
    if (!custom) return { ...defaults };
    return custom;
  });

  for (const offer of customs) {
    if (!offer.active) continue;
    if (!merged.some((row) => row.id === offer.id)) {
      merged.push({ ...offer, salonId, isDefault: false });
    }
  }

  return merged;
}

export async function getOffersForSalon(salonId: string): Promise<VmbOffer[]> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    const customs = await listSalonOffersPostgres(salonId);
    return mergeOffersForSalon(salonId, customs);
  }

  const all = await listOffersJson();
  const customs = all.filter((row) => row.salonId === salonId).map((row) => row.offer);
  return mergeOffersForSalon(salonId, customs);
}

export async function getActiveOffersForSalon(salonId: string): Promise<VmbOffer[]> {
  const offers = await getOffersForSalon(salonId);
  return offers.filter((offer) => offer.active);
}

export async function getOfferForCategory(
  salonId: string,
  category: VmbOfferCategory,
): Promise<VmbOffer> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    const custom = await getSalonOfferByCategoryPostgres(salonId, category);
    if (custom?.active) {
      return { ...getDefaultOfferForCategory(category), ...custom, isDefault: false, salonId };
    }
    return getDefaultOfferForCategory(category);
  }

  const all = await listOffersJson();
  const custom = all.find(
    (row) => row.salonId === salonId && row.offer.category === category && row.offer.active,
  )?.offer;
  if (custom) {
    return { ...getDefaultOfferForCategory(category), ...custom, isDefault: false, salonId };
  }
  return getDefaultOfferForCategory(category);
}

export function getOfferForCategorySync(category: VmbOfferCategory): VmbOffer {
  return getDefaultOfferForCategory(category);
}

export async function upsertOffer(
  salonId: string,
  offer: VmbOffer,
): Promise<{ offer: VmbOffer } | { error: string }> {
  const writable = await assertOfferWritable();
  if ("error" in writable) return writable;

  const payload: VmbOffer = {
    ...offer,
    salonId,
    isDefault: false,
    source: offer.source ?? "manual",
    updatedAt: new Date().toISOString(),
  };

  if (writable.backend === "postgres") {
    const saved = await upsertSalonOfferPostgres(salonId, payload);
    if ("error" in saved) {
      return vmbProductionRequiresPostgres() ? { error: OFFER_POSTGRES_REQUIRED } : saved;
    }
    if (vmbJsonFallbackAllowed()) {
      const all = await listOffersJson();
      const others = all.filter((row) => !(row.salonId === salonId && row.offer.id === saved.offer.id));
      await writeJsonArray(getVmbOffersFile(), [...others, { salonId, offer: saved.offer }]);
    }
    return saved;
  }

  const all = await listOffersJson();
  const id = payload.id.startsWith("default-") ? `${salonId}-${payload.category}` : payload.id;
  payload.id = id;
  const others = all.filter((row) => !(row.salonId === salonId && row.offer.id === id));
  const err = await writeJsonArray(getVmbOffersFile(), [...others, { salonId, offer: payload }]);
  if (err) {
    return vmbProductionRequiresPostgres() ? { error: OFFER_POSTGRES_REQUIRED } : { error: err };
  }
  return { offer: payload };
}

export async function archiveOffer(
  salonId: string,
  offerId: string,
): Promise<{ ok: true } | { error: string }> {
  if (offerId.startsWith("default-")) {
    return { error: "Default offers cannot be archived" };
  }

  const writable = await assertOfferWritable();
  if ("error" in writable) return writable;

  if (writable.backend === "postgres") {
    const archived = await archiveSalonOfferPostgres(salonId, offerId);
    if ("error" in archived) {
      return vmbProductionRequiresPostgres() ? { error: OFFER_POSTGRES_REQUIRED } : archived;
    }
    if (vmbJsonFallbackAllowed()) {
      const all = await listOffersJson();
      const next = all.map((row) => {
        if (row.salonId === salonId && row.offer.id === offerId) {
          return { salonId, offer: { ...row.offer, active: false } };
        }
        return row;
      });
      await writeJsonArray(getVmbOffersFile(), next);
    }
    return { ok: true };
  }

  const all = await listOffersJson();
  const next = all.map((row) => {
    if (row.salonId === salonId && row.offer.id === offerId) {
      return { salonId, offer: { ...row.offer, active: false } };
    }
    return row;
  });
  const err = await writeJsonArray(getVmbOffersFile(), next);
  if (err) {
    return vmbProductionRequiresPostgres() ? { error: OFFER_POSTGRES_REQUIRED } : { error: err };
  }
  return { ok: true };
}

export async function resetOffersToDefaults(
  salonId: string,
): Promise<{ ok: true; offers: VmbOffer[] } | { error: string }> {
  const writable = await assertOfferWritable();
  if ("error" in writable) return writable;

  if (writable.backend === "postgres") {
    await deleteAllSalonOffersPostgres(salonId);
    if (vmbJsonFallbackAllowed()) {
      const all = await listOffersJson();
      await writeJsonArray(
        getVmbOffersFile(),
        all.filter((row) => row.salonId !== salonId),
      );
    }
    return { ok: true, offers: getAllDefaultOffers() };
  }

  const all = await listOffersJson();
  const err = await writeJsonArray(
    getVmbOffersFile(),
    all.filter((row) => row.salonId !== salonId),
  );
  if (err) {
    return vmbProductionRequiresPostgres() ? { error: OFFER_POSTGRES_REQUIRED } : { error: err };
  }
  return { ok: true, offers: getAllDefaultOffers() };
}

export async function clearSalonOffers(salonId: string): Promise<void> {
  await deleteAllSalonOffersPostgres(salonId);
  if (vmbJsonFallbackAllowed()) {
    const all = await listOffersJson();
    await writeJsonArray(
      getVmbOffersFile(),
      all.filter((row) => row.salonId !== salonId),
    );
  }
}

export { getAllDefaultOffers, getDefaultOfferForCategory };
