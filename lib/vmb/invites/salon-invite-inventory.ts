import type { SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";

export type SalonInviteInventoryStatus = "published" | "paused";

export function getSalonInviteInventoryStatus(copy: SalonInviteLocalCopy): SalonInviteInventoryStatus {
  return copy.inventoryStatus ?? "published";
}

export function isSalonInviteMatchingActive(copy: SalonInviteLocalCopy): boolean {
  return getSalonInviteInventoryStatus(copy) === "published";
}

export function salonInviteInventoryStatusLabel(copy: SalonInviteLocalCopy): string {
  return getSalonInviteInventoryStatus(copy) === "paused" ? "Paused" : "Published";
}

/** Copies eligible for TAIKOS suggested matching and service participation. */
export function publishedCopiesForMatching(copies: SalonInviteLocalCopy[]): SalonInviteLocalCopy[] {
  return copies.filter(isSalonInviteMatchingActive);
}

export function duplicateSalonInviteLocalCopy(copy: SalonInviteLocalCopy): SalonInviteLocalCopy {
  const now = new Date().toISOString();
  const duplicateId = `${copy.salonId}-${copy.sourceTemplateId}-dup-${Date.now()}`;
  const nextVersion = copy.publishedVersion + 1;

  return {
    ...copy,
    id: duplicateId,
    publishedVersion: nextVersion,
    inventoryStatus: "published",
    snapshot: {
      ...copy.snapshot,
      id: duplicateId,
      templateName: `${copy.snapshot.templateName} (Copy)`,
      version: nextVersion,
      status: "published",
      createdAt: now,
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export type SalonInviteLocalCopyPatch = {
  inventoryStatus?: SalonInviteInventoryStatus;
  headline?: string;
  body?: string;
  ctaLabel?: string;
};

export function applySalonInviteLocalCopyPatch(
  copy: SalonInviteLocalCopy,
  patch: SalonInviteLocalCopyPatch,
): SalonInviteLocalCopy {
  const now = new Date().toISOString();
  return {
    ...copy,
    inventoryStatus: patch.inventoryStatus ?? copy.inventoryStatus ?? "published",
    updatedAt: now,
    snapshot: {
      ...copy.snapshot,
      headline: patch.headline ?? copy.snapshot.headline,
      body: patch.body ?? copy.snapshot.body,
      ctaLabel: patch.ctaLabel ?? copy.snapshot.ctaLabel,
      updatedAt: now,
    },
  };
}
