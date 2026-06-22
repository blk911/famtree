import type { SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";

export type SalonInviteInventoryStatus = "needs_review" | "approved" | "paused" | "archived" | "published";
export type CanonicalSalonInviteInventoryStatus = Exclude<SalonInviteInventoryStatus, "published">;

export function getSalonInviteInventoryStatus(copy: SalonInviteLocalCopy): CanonicalSalonInviteInventoryStatus {
  const status = copy.inventoryStatus ?? "published";
  return status === "published" ? "approved" : status;
}

export function isSalonInviteMatchingActive(copy: SalonInviteLocalCopy): boolean {
  return getSalonInviteInventoryStatus(copy) === "approved";
}

export function salonInviteInventoryStatusLabel(copy: SalonInviteLocalCopy): string {
  const status = getSalonInviteInventoryStatus(copy);
  if (status === "needs_review") return "Needs Review";
  if (status === "paused") return "Paused";
  if (status === "archived") return "Archived";
  return "Approved";
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
    inventoryStatus: "needs_review",
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
  serviceIds?: string[];
  rewardIds?: string[];
  totalValue?: number;
  savingsAmount?: number;
  offerPrice?: number;
  valueLabel?: string;
  priceLabel?: string;
};

export function applySalonInviteLocalCopyPatch(
  copy: SalonInviteLocalCopy,
  patch: SalonInviteLocalCopyPatch,
): SalonInviteLocalCopy {
  const now = new Date().toISOString();
  return {
    ...copy,
    inventoryStatus: patch.inventoryStatus ?? copy.inventoryStatus ?? "approved",
    updatedAt: now,
    snapshot: {
      ...copy.snapshot,
      headline: patch.headline ?? copy.snapshot.headline,
      body: patch.body ?? copy.snapshot.body,
      ctaLabel: patch.ctaLabel ?? copy.snapshot.ctaLabel,
      serviceIds: patch.serviceIds ? [...patch.serviceIds] : copy.snapshot.serviceIds,
      rewardIds: patch.rewardIds ? [...patch.rewardIds] : copy.snapshot.rewardIds,
      totalValue: patch.totalValue ?? copy.snapshot.totalValue,
      savingsAmount: patch.savingsAmount ?? copy.snapshot.savingsAmount,
      offerPrice: patch.offerPrice ?? copy.snapshot.offerPrice,
      valueLabel: patch.valueLabel ?? copy.snapshot.valueLabel,
      priceLabel: patch.priceLabel ?? copy.snapshot.priceLabel,
      updatedAt: now,
    },
  };
}
