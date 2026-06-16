import {
  getCatalogServiceOffer,
  getServiceAddon,
} from "@/lib/vmb/services/canonical-service-catalog";
import { getSalonFacingServicesForCategory, getSalonPrimaryCategory } from "@/lib/vmb/services/salon-service-config-store";
import type { SalonFacingServiceOffer } from "@/lib/vmb/services/service-preset-types";
import { resolveVmbStorageBackend } from "@/lib/vmb/db";
import { getVmbSalonOfferCatalogFile } from "@/lib/vmb/paths";
import { readJsonArray, writeJsonArray } from "@/lib/vmb/runtime-json-store";
import { assertVmbWritableBackend, vmbProductionRequiresPostgres } from "@/lib/vmb/storage-policy";
import type {
  CreateSalonOfferInput,
  ResolvedSalonOfferDisplay,
  SalonOfferCatalogEntry,
  UpdateSalonOfferInput,
} from "./salon-offer-catalog-types";
import {
  calculateSalonOfferPriceCents,
  resolveOfferPriceCents,
} from "./salon-offer-pricing";
import {
  deleteSalonOfferCatalogPostgres,
  getSalonOfferCatalogEntryPostgres,
  listSalonOfferCatalogPostgres,
  upsertSalonOfferCatalogPostgres,
} from "./salon-offer-catalog-store-postgres";

export const SALON_OFFER_CATALOG_POSTGRES_REQUIRED = "SALON_OFFER_CATALOG_POSTGRES_REQUIRED";

type StoredSalonOffer = { salonId: string; entry: SalonOfferCatalogEntry };

function isStoredOffer(item: unknown): item is StoredSalonOffer {
  if (!item || typeof item !== "object") return false;
  const row = item as StoredSalonOffer;
  return typeof row.salonId === "string" && typeof row.entry?.id === "string";
}

function newOfferId(): string {
  return `offer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function listOffersJson(): Promise<StoredSalonOffer[]> {
  return readJsonArray(getVmbSalonOfferCatalogFile(), isStoredOffer);
}

async function loadSalonOffers(salonId: string): Promise<SalonOfferCatalogEntry[]> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    return listSalonOfferCatalogPostgres(salonId);
  }
  const all = await listOffersJson();
  return all.filter((row) => row.salonId === salonId).map((row) => row.entry);
}

async function getOfferJson(salonId: string, offerId: string): Promise<SalonOfferCatalogEntry | undefined> {
  const all = await listOffersJson();
  return all.find((row) => row.salonId === salonId && row.entry.id === offerId)?.entry;
}

export async function listSalonOfferCatalog(
  salonId: string,
  options?: { activeOnly?: boolean },
): Promise<SalonOfferCatalogEntry[]> {
  const offers = await loadSalonOffers(salonId);
  const sorted = offers.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  if (options?.activeOnly) return sorted.filter((offer) => offer.active);
  return sorted;
}

export async function getSalonOfferCatalogEntry(
  salonId: string,
  offerId: string,
): Promise<SalonOfferCatalogEntry | undefined> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    return getSalonOfferCatalogEntryPostgres(salonId, offerId);
  }
  return getOfferJson(salonId, offerId);
}

export async function getEnabledSalonServicesForOffers(
  salonId: string,
): Promise<SalonFacingServiceOffer[]> {
  const categoryId = await getSalonPrimaryCategory(salonId);
  const services = await getSalonFacingServicesForCategory(salonId, categoryId);
  return services.filter((service) => service.enabled);
}

async function validateOfferService(
  salonId: string,
  serviceId: string,
  addonIds: string[],
): Promise<{ service: SalonFacingServiceOffer } | { error: string }> {
  const enabled = await getEnabledSalonServicesForOffers(salonId);
  const service = enabled.find((row) => row.serviceOfferId === serviceId);
  if (!service) {
    return { error: "Service must be enabled in your salon menu before building an offer" };
  }
  const allowed = new Set(
    service.addons.filter((addon) => addon.enabled).map((addon) => addon.addonId),
  );
  for (const addonId of addonIds) {
    if (!allowed.has(addonId)) {
      return { error: "One or more add-ons are not enabled for the selected service" };
    }
  }
  return { service };
}

async function persistEntry(
  entry: SalonOfferCatalogEntry,
): Promise<{ entry: SalonOfferCatalogEntry } | { error: string }> {
  const writable = await assertVmbWritableBackend();
  if ("error" in writable) {
    if (vmbProductionRequiresPostgres()) {
      return { error: SALON_OFFER_CATALOG_POSTGRES_REQUIRED };
    }
    return { error: writable.error };
  }

  if (writable.backend === "postgres") {
    const saved = await upsertSalonOfferCatalogPostgres(entry);
    if ("error" in saved) {
      return vmbProductionRequiresPostgres()
        ? { error: SALON_OFFER_CATALOG_POSTGRES_REQUIRED }
        : saved;
    }
    return saved;
  }

  const all = await listOffersJson();
  const others = all.filter(
    (row) => !(row.salonId === entry.salonId && row.entry.id === entry.id),
  );
  await writeJsonArray(getVmbSalonOfferCatalogFile(), [...others, { salonId: entry.salonId, entry }]);
  return { entry };
}

export async function createSalonOfferCatalogEntry(
  salonId: string,
  input: CreateSalonOfferInput,
): Promise<{ entry: SalonOfferCatalogEntry } | { error: string }> {
  const validated = await validateOfferService(salonId, input.serviceId, input.addonIds ?? []);
  if ("error" in validated) return validated;

  const calculatedPriceCents = calculateSalonOfferPriceCents(validated.service, input.addonIds ?? []);
  const now = new Date().toISOString();
  const entry: SalonOfferCatalogEntry = {
    id: newOfferId(),
    salonId,
    name: input.name.trim(),
    description: input.description.trim(),
    serviceId: input.serviceId,
    addonIds: [...(input.addonIds ?? [])],
    calculatedPriceCents,
    priceCents: resolveOfferPriceCents(calculatedPriceCents, input.priceOverrideCents),
    priceOverrideCents: input.priceOverrideCents ?? null,
    active: input.active ?? true,
    imageUrl: input.imageUrl?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  if (!entry.name) return { error: "Offer name is required" };
  return persistEntry(entry);
}

export async function updateSalonOfferCatalogEntry(
  salonId: string,
  offerId: string,
  input: UpdateSalonOfferInput,
): Promise<{ entry: SalonOfferCatalogEntry } | { error: string }> {
  const existing = await getSalonOfferCatalogEntry(salonId, offerId);
  if (!existing) return { error: "Offer not found" };

  const serviceId = input.serviceId ?? existing.serviceId;
  const addonIds = input.addonIds ?? existing.addonIds;
  const serviceOrAddonChanged =
    (input.serviceId !== undefined && input.serviceId !== existing.serviceId) ||
    (input.addonIds !== undefined &&
      input.addonIds.join("\0") !== existing.addonIds.join("\0"));

  let calculatedPriceCents = existing.calculatedPriceCents;
  if (serviceOrAddonChanged) {
    const validated = await validateOfferService(salonId, serviceId, addonIds);
    if ("error" in validated) return validated;
    calculatedPriceCents = calculateSalonOfferPriceCents(validated.service, addonIds);
  } else {
    const enabled = await getEnabledSalonServicesForOffers(salonId);
    const service = enabled.find((row) => row.serviceOfferId === serviceId);
    if (service) {
      calculatedPriceCents = calculateSalonOfferPriceCents(service, addonIds);
    }
  }
  const priceOverrideCents =
    input.priceOverrideCents !== undefined ? input.priceOverrideCents : existing.priceOverrideCents;

  const entry: SalonOfferCatalogEntry = {
    ...existing,
    name: input.name?.trim() ? input.name.trim() : existing.name,
    description: input.description !== undefined ? input.description.trim() : existing.description,
    serviceId,
    addonIds,
    calculatedPriceCents,
    priceOverrideCents,
    priceCents: resolveOfferPriceCents(calculatedPriceCents, priceOverrideCents),
    active: input.active ?? existing.active,
    imageUrl: input.imageUrl !== undefined ? input.imageUrl.trim() || undefined : existing.imageUrl,
    updatedAt: new Date().toISOString(),
  };

  return persistEntry(entry);
}

export async function archiveSalonOfferCatalogEntry(
  salonId: string,
  offerId: string,
): Promise<{ ok: true } | { error: string }> {
  const updated = await updateSalonOfferCatalogEntry(salonId, offerId, { active: false });
  if ("error" in updated) return updated;
  return { ok: true };
}

export async function deleteSalonOfferCatalogEntry(
  salonId: string,
  offerId: string,
): Promise<{ ok: true } | { error: string }> {
  const writable = await assertVmbWritableBackend();
  if ("error" in writable) return writable;

  if (writable.backend === "postgres") {
    await deleteSalonOfferCatalogPostgres(salonId, offerId);
  } else {
    const all = await listOffersJson();
    await writeJsonArray(
      getVmbSalonOfferCatalogFile(),
      all.filter((row) => !(row.salonId === salonId && row.entry.id === offerId)),
    );
  }
  return { ok: true };
}

const SERVICE_UNAVAILABLE_WARNING =
  "This offer's service is no longer available. Update or disable this offer.";

function fallbackAddonLabels(addonIds: string[]): string[] {
  return addonIds
    .map((addonId) => getServiceAddon(addonId)?.name)
    .filter((label): label is string => Boolean(label));
}

function fallbackServiceName(serviceId: string): string {
  return getCatalogServiceOffer(serviceId)?.name ?? "Included service";
}

export async function resolveSalonOfferDisplay(
  salonId: string,
  offerId: string,
): Promise<ResolvedSalonOfferDisplay | undefined> {
  const entry = await getSalonOfferCatalogEntry(salonId, offerId);
  if (!entry || !entry.active) return undefined;

  const services = await getEnabledSalonServicesForOffers(salonId);
  const service = services.find((row) => row.serviceOfferId === entry.serviceId);
  const selected = new Set(entry.addonIds);

  if (service) {
    const addonLabels = service.addons
      .filter((addon) => addon.enabled && selected.has(addon.addonId))
      .map((addon) => addon.label);

    return {
      id: entry.id,
      name: entry.name,
      description: entry.description,
      priceCents: entry.priceCents,
      calculatedPriceCents: entry.calculatedPriceCents,
      imageUrl: entry.imageUrl,
      serviceName: service.displayName,
      includedLines: [service.displayName, ...addonLabels],
      addonLabels,
    };
  }

  const serviceName = fallbackServiceName(entry.serviceId);
  const addonLabels = fallbackAddonLabels(entry.addonIds);

  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    priceCents: entry.priceCents,
    calculatedPriceCents: entry.calculatedPriceCents,
    imageUrl: entry.imageUrl,
    serviceName,
    includedLines: [serviceName, ...addonLabels],
    addonLabels,
    serviceUnavailable: true,
    serviceWarning: SERVICE_UNAVAILABLE_WARNING,
  };
}
