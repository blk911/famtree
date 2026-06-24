import {
  buildDraftInviteSnapshot,
  buildNailTemplateDraft,
  templateStorageId,
} from "@/lib/vmb/admin/nail-template-library";
import { resolveVmbStorageBackend } from "@/lib/vmb/db";
import { DEFAULT_NAIL_INVITE_TEMPLATES } from "@/lib/vmb/invite-templates/default-nail-invite-templates";
import { getInviteTemplate, listInviteTemplates } from "@/lib/vmb/invite-templates/invite-template-store";
import type { VmbInviteTemplate } from "@/lib/vmb/invite-templates/invite-template-types";
import { calculateInvitationPackagePricing } from "@/lib/vmb/invites/invitation-package-pricing";
import { parseInviteTemplateSnapshot } from "@/lib/vmb/invites/invite-template-snapshot";
import {
  normalizeSourceTemplateId,
  templateKeysForPublishedCopy,
} from "@/lib/vmb/invites/published-copy-matching";
import { createSalonLocalCopy, type SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";
import {
  applySalonInviteLocalCopyPatch,
  duplicateSalonInviteLocalCopy,
  getSalonInviteInventoryStatus,
  type SalonInviteLocalCopyPatch,
} from "@/lib/vmb/invites/salon-invite-inventory";
import {
  listSalonInviteLocalCopiesPostgres,
  publishSalonInviteLocalCopyPostgres,
  upsertSalonInviteLocalCopyPostgres,
} from "@/lib/vmb/invites/salon-invite-local-copy-store-postgres";
import { getOffersForSalon } from "@/lib/vmb/offers/offer-store";
import { getVmbSalonInviteCopiesFile } from "@/lib/vmb/paths";
import { readJsonArray, writeJsonArray } from "@/lib/vmb/runtime-json-store";
import { getSalonFacingServicesForCategory } from "@/lib/vmb/services/salon-service-config-store";
import { assertVmbWritableBackend, vmbJsonFallbackAllowed, vmbProductionRequiresPostgres } from "@/lib/vmb/storage-policy";

export type SalonInviteCopyBackend = "postgres" | "json";

export type PublishSalonInviteCopyResult = {
  copy: SalonInviteLocalCopy;
  backend: SalonInviteCopyBackend;
};

export type SyncSalonInviteCopiesResult = {
  copies: SalonInviteLocalCopy[];
  createdCount: number;
};

type StoredSalonInviteCopy = {
  salonId: string;
  copy: SalonInviteLocalCopy;
};

function isStoredSalonInviteCopy(item: unknown): item is StoredSalonInviteCopy {
  if (!item || typeof item !== "object") return false;
  const row = item as StoredSalonInviteCopy;
  return typeof row.salonId === "string" && !!row.copy && typeof row.copy.id === "string";
}

async function listStoredJson(): Promise<StoredSalonInviteCopy[]> {
  return readJsonArray(getVmbSalonInviteCopiesFile(), isStoredSalonInviteCopy);
}

async function assertCopyWritable(): Promise<
  { ok: true; backend: SalonInviteCopyBackend } | { error: string }
> {
  const writable = await assertVmbWritableBackend();
  if (!writable.ok) {
    return { error: writable.error };
  }
  return { ok: true, backend: writable.backend };
}

async function listSalonInviteLocalCopiesJson(salonId: string): Promise<SalonInviteLocalCopy[]> {
  const all = await listStoredJson();
  return all
    .filter((row) => row.salonId === salonId)
    .map((row) => row.copy)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function publishSalonInviteLocalCopyJson(
  salonId: string,
  copy: SalonInviteLocalCopy,
  replaceTemplateKeys: string[],
): Promise<{ copy: SalonInviteLocalCopy } | { error: string }> {
  const all = await listStoredJson();
  const others = all.filter((row) => {
    if (row.salonId !== salonId) return true;
    const keys = templateKeysForPublishedCopy(row.copy);
    return !keys.some((key) => replaceTemplateKeys.includes(key));
  });
  const err = await writeJsonArray(getVmbSalonInviteCopiesFile(), [...others, { salonId, copy }]);
  if (err) {
    return { error: err };
  }
  return { copy };
}

async function upsertSalonInviteLocalCopyJson(
  salonId: string,
  copy: SalonInviteLocalCopy,
): Promise<{ copy: SalonInviteLocalCopy } | { error: string }> {
  const all = await listStoredJson();
  const others = all.filter((row) => row.copy.id !== copy.id);
  const err = await writeJsonArray(getVmbSalonInviteCopiesFile(), [...others, { salonId, copy }]);
  if (err) {
    return { error: err };
  }
  return { copy };
}

async function saveSalonInviteLocalCopy(
  salonId: string,
  copy: SalonInviteLocalCopy,
  writable: { backend: SalonInviteCopyBackend },
): Promise<{ copy: SalonInviteLocalCopy; backend: SalonInviteCopyBackend } | { error: string }> {
  if (writable.backend === "postgres") {
    const saved = await upsertSalonInviteLocalCopyPostgres(salonId, copy);
    if ("error" in saved) {
      if (vmbProductionRequiresPostgres()) {
        return saved;
      }
      const jsonSaved = await upsertSalonInviteLocalCopyJson(salonId, copy);
      if ("error" in jsonSaved) return jsonSaved;
      return { copy: jsonSaved.copy, backend: "json" };
    }
    if (vmbJsonFallbackAllowed()) {
      await upsertSalonInviteLocalCopyJson(salonId, saved.copy);
    }
    return { copy: saved.copy, backend: "postgres" };
  }

  const jsonSaved = await upsertSalonInviteLocalCopyJson(salonId, copy);
  if ("error" in jsonSaved) {
    return jsonSaved;
  }
  return { copy: jsonSaved.copy, backend: "json" };
}

export async function listSalonInviteLocalCopies(salonId: string): Promise<SalonInviteLocalCopy[]> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    return listSalonInviteLocalCopiesPostgres(salonId);
  }
  return listSalonInviteLocalCopiesJson(salonId);
}

export async function getSalonInviteLocalCopy(
  salonId: string,
  copyId: string,
): Promise<SalonInviteLocalCopy | null> {
  const copies = await listSalonInviteLocalCopies(salonId);
  return copies.find((copy) => copy.id === copyId) ?? null;
}

export async function publishLibraryTemplateToSalon(
  salonId: string,
  templateId: string,
): Promise<PublishSalonInviteCopyResult | { error: string }> {
  const writable = await assertCopyWritable();
  if ("error" in writable) return writable;

  const canonicalTemplateId = normalizeSourceTemplateId(templateId) ?? templateId;
  const storageId = templateStorageId(salonId, canonicalTemplateId);
  const offers = await getOffersForSalon(salonId);
  const saved = offers.find((offer) => offer.id === storageId && !offer.isDefault);
  const masterTemplate = await getInviteTemplate(canonicalTemplateId);
  const snapshot =
    parseInviteTemplateSnapshot(saved?.inviteSnapshot) ??
    parseInviteTemplateSnapshot(masterTemplate?.librarySnapshot);
  if (!snapshot) {
    return { error: "Template is not saved to library with a snapshot." };
  }

  const existingCopy = (await listSalonInviteLocalCopies(salonId)).find((copy) =>
    templateKeysForPublishedCopy(copy).includes(canonicalTemplateId),
  );
  if (existingCopy) {
    const status = getSalonInviteInventoryStatus(existingCopy);
    if (status !== "needs_review") {
      return { copy: existingCopy, backend: writable.backend };
    }
  }

  const copy = createSalonLocalCopy(snapshot, salonId);
  const replaceKeys = templateKeysForPublishedCopy(copy);
  if (!replaceKeys.includes(canonicalTemplateId)) {
    replaceKeys.push(canonicalTemplateId);
  }

  if (writable.backend === "postgres") {
    const savedCopy = await publishSalonInviteLocalCopyPostgres(salonId, copy, replaceKeys);
    if ("error" in savedCopy) {
      if (vmbProductionRequiresPostgres()) {
        return savedCopy;
      }
      const jsonSaved = await publishSalonInviteLocalCopyJson(salonId, copy, replaceKeys);
      if ("error" in jsonSaved) return jsonSaved;
      return { copy: jsonSaved.copy, backend: "json" };
    }
    if (vmbJsonFallbackAllowed()) {
      await publishSalonInviteLocalCopyJson(salonId, savedCopy.copy, replaceKeys);
    }
    return { copy: savedCopy.copy, backend: "postgres" };
  }

  const jsonSaved = await publishSalonInviteLocalCopyJson(salonId, copy, replaceKeys);
  if ("error" in jsonSaved) {
    return jsonSaved;
  }
  return { copy: jsonSaved.copy, backend: "json" };
}

function normalizeDefaultCatalogId(id: string): string {
  const match = id.match(/^[a-z0-9-]+-(default-.+)$/i);
  return match?.[1] ?? id;
}

async function buildDefaultTemplateCopyForSalon(
  salonId: string,
  template: VmbInviteTemplate,
): Promise<SalonInviteLocalCopy | null> {
  if (!template?.active) return null;

  const services = await getSalonFacingServicesForCategory(salonId, "nails");
  const activeServices = services.filter((service) => service.status === "active");
  const servicesForTemplateDefaults = activeServices.length > 0 ? activeServices : services;
  const servicePriceById: Record<string, number> = {};
  const activeServiceIds = new Set<string>();
  for (const service of servicesForTemplateDefaults) {
    const price = (service.priceCents ?? 0) / 100;
    servicePriceById[service.serviceOfferId] = price;
    servicePriceById[normalizeDefaultCatalogId(service.serviceOfferId)] = price;
    activeServiceIds.add(service.serviceOfferId);
    activeServiceIds.add(normalizeDefaultCatalogId(service.serviceOfferId));
  }

  const addonPriceById: Record<string, number> = {};
  for (const service of servicesForTemplateDefaults) {
    for (const addon of service.addons) {
      if (!addon.enabled) continue;
      const price = (addon.priceCents ?? 0) / 100;
      addonPriceById[addon.addonId] = price;
      addonPriceById[normalizeDefaultCatalogId(addon.addonId)] = price;
    }
  }

  const masterSnapshot = parseInviteTemplateSnapshot(template.librarySnapshot);
  if (masterSnapshot) {
    return createSalonLocalCopy(
      {
        ...masterSnapshot,
        status: "library",
        version: masterSnapshot.version > 0 ? masterSnapshot.version : 1,
      },
      salonId,
    );
  }

  const draft = buildNailTemplateDraft(template, undefined);
  const serviceIds = draft.serviceIds.filter((serviceId) => activeServiceIds.has(serviceId));
  if (serviceIds.length === 0) return null;

  const pricing = calculateInvitationPackagePricing({
    serviceIds,
    serviceOptionIds: draft.serviceOptionIds,
    servicePriceById,
    addonPriceById,
    savingsAmount: draft.savingsAmount,
    inviteType: template.inviteType,
  });

  const snapshot = buildDraftInviteSnapshot(
    {
      ...draft,
      serviceIds,
      saved: true,
    },
    {
      salonName: "Your Salon",
      totalValue: pricing.totalValue,
      savingsAmount: pricing.savingsAmount,
      offerPrice: pricing.offerPrice,
      valueLabel: pricing.valueLabel,
      priceLabel: pricing.priceLabel,
    },
  );

  return createSalonLocalCopy(
    {
      ...snapshot,
      status: "library",
      version: snapshot.version > 0 ? snapshot.version : 1,
    },
    salonId,
  );
}

/** Materialize missing salon-owned review copies from this salon's saved library snapshots. */
export async function syncLibraryTemplatesToSalon(
  salonId: string,
): Promise<SyncSalonInviteCopiesResult | { error: string }> {
  const writable = await assertCopyWritable();
  if ("error" in writable) return writable;

  const offers = await getOffersForSalon(salonId);
  const templateIds = Array.from(new Set(
    offers
      .filter((offer) => !offer.isDefault && offer.templateId && parseInviteTemplateSnapshot(offer.inviteSnapshot))
      .map((offer) => normalizeSourceTemplateId(offer.templateId) ?? offer.templateId!)
      .filter(Boolean),
  ));

  const before = await listSalonInviteLocalCopies(salonId);
  const beforeKeys = new Set(before.flatMap(templateKeysForPublishedCopy));

  for (const templateId of templateIds) {
    if (beforeKeys.has(templateId)) continue;
    const published = await publishLibraryTemplateToSalon(salonId, templateId);
    if ("error" in published) return published;
    beforeKeys.add(templateId);
  }

  const adminTemplates = await listInviteTemplates("nails", { includeInactive: true });
  const templatePool = adminTemplates.length ? adminTemplates : DEFAULT_NAIL_INVITE_TEMPLATES;

  for (const template of templatePool) {
    if (beforeKeys.has(template.id)) continue;
    const copy = await buildDefaultTemplateCopyForSalon(salonId, template);
    if (!copy) continue;
    const saved = await saveSalonInviteLocalCopy(salonId, copy, writable);
    if ("error" in saved) return saved;
    beforeKeys.add(template.id);
  }

  const copies = await listSalonInviteLocalCopies(salonId);
  return { copies, createdCount: Math.max(0, copies.length - before.length) };
}

export async function updateSalonInviteLocalCopy(
  salonId: string,
  copyId: string,
  patch: SalonInviteLocalCopyPatch,
): Promise<PublishSalonInviteCopyResult | { error: string }> {
  const writable = await assertCopyWritable();
  if ("error" in writable) return writable;

  const existing = await getSalonInviteLocalCopy(salonId, copyId);
  if (!existing) {
    return { error: "Published invitation not found." };
  }

  const updated = applySalonInviteLocalCopyPatch(existing, patch);
  return saveSalonInviteLocalCopy(salonId, updated, writable);
}

export async function duplicateSalonInviteLocalCopyForSalon(
  salonId: string,
  copyId: string,
): Promise<PublishSalonInviteCopyResult | { error: string }> {
  const writable = await assertCopyWritable();
  if ("error" in writable) return writable;

  const existing = await getSalonInviteLocalCopy(salonId, copyId);
  if (!existing) {
    return { error: "Published invitation not found." };
  }

  const duplicate = duplicateSalonInviteLocalCopy(existing);
  return saveSalonInviteLocalCopy(salonId, duplicate, writable);
}
