import { templateStorageId } from "@/lib/vmb/admin/nail-template-library";
import { parseInviteTemplateSnapshot } from "@/lib/vmb/invites/invite-template-snapshot";
import {
  normalizeSourceTemplateId,
  templateKeysForPublishedCopy,
} from "@/lib/vmb/invites/published-copy-matching";
import { createSalonLocalCopy, type SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";
import { getOffersForSalon } from "@/lib/vmb/offers/offer-store";
import { getVmbSalonInviteCopiesFile } from "@/lib/vmb/paths";
import { readJsonArray, writeJsonArray } from "@/lib/vmb/runtime-json-store";
import { assertVmbWritableBackend, vmbProductionRequiresPostgres } from "@/lib/vmb/storage-policy";

export const SALON_INVITE_COPY_POSTGRES_REQUIRED = "SALON_INVITE_COPY_POSTGRES_REQUIRED";

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

async function assertCopyWritable(): Promise<{ ok: true } | { error: string }> {
  const writable = await assertVmbWritableBackend();
  if (!writable.ok) {
    if (vmbProductionRequiresPostgres()) {
      return { error: SALON_INVITE_COPY_POSTGRES_REQUIRED };
    }
    return { error: writable.error };
  }
  return { ok: true };
}

export async function listSalonInviteLocalCopies(salonId: string): Promise<SalonInviteLocalCopy[]> {
  const all = await listStoredJson();
  return all
    .filter((row) => row.salonId === salonId)
    .map((row) => row.copy)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function publishLibraryTemplateToSalon(
  salonId: string,
  templateId: string,
): Promise<{ copy: SalonInviteLocalCopy } | { error: string }> {
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
  const all = await listStoredJson();
  const others = all.filter((row) => {
    if (row.salonId !== salonId) return true;
    const keys = templateKeysForPublishedCopy(row.copy);
    return !keys.includes(canonicalTemplateId);
  });
  const err = await writeJsonArray(getVmbSalonInviteCopiesFile(), [...others, { salonId, copy }]);
  if (err) {
    return vmbProductionRequiresPostgres() ? { error: SALON_INVITE_COPY_POSTGRES_REQUIRED } : { error: err };
  }
  return { copy };
}
