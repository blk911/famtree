import { templateStorageId } from "@/lib/vmb/admin/nail-template-library";
import { resolveVmbStorageBackend } from "@/lib/vmb/db";
import { parseInviteTemplateSnapshot } from "@/lib/vmb/invites/invite-template-snapshot";
import {
  normalizeSourceTemplateId,
  templateKeysForPublishedCopy,
} from "@/lib/vmb/invites/published-copy-matching";
import {
  listSalonInviteLocalCopiesPostgres,
  publishSalonInviteLocalCopyPostgres,
} from "@/lib/vmb/invites/salon-invite-local-copy-store-postgres";
import { createSalonLocalCopy, type SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";
import { getOffersForSalon } from "@/lib/vmb/offers/offer-store";
import { getVmbSalonInviteCopiesFile } from "@/lib/vmb/paths";
import { readJsonArray, writeJsonArray } from "@/lib/vmb/runtime-json-store";
import { assertVmbWritableBackend, vmbJsonFallbackAllowed, vmbProductionRequiresPostgres } from "@/lib/vmb/storage-policy";

export type SalonInviteCopyBackend = "postgres" | "json";

export type PublishSalonInviteCopyResult = {
  copy: SalonInviteLocalCopy;
  backend: SalonInviteCopyBackend;
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

export async function listSalonInviteLocalCopies(salonId: string): Promise<SalonInviteLocalCopy[]> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    return listSalonInviteLocalCopiesPostgres(salonId);
  }
  return listSalonInviteLocalCopiesJson(salonId);
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
  const snapshot = parseInviteTemplateSnapshot(saved?.inviteSnapshot);
  if (!snapshot) {
    return { error: "Template is not saved to library with a snapshot." };
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
