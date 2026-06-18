import type { InviteTemplateSnapshot } from "@/lib/vmb/invites/invite-template-snapshot";
import type { SalonInviteInventoryStatus } from "@/lib/vmb/invites/salon-invite-inventory";

/** Salon-local invite copy — independent from admin master library after publish. */
export type SalonInviteLocalCopy = {
  id: string;
  salonId: string;
  sourceTemplateId: string;
  publishedVersion: number;
  /** Salon inventory availability — paused copies stay in inventory but skip TAIKOS matching. */
  inventoryStatus?: SalonInviteInventoryStatus;
  snapshot: InviteTemplateSnapshot;
  createdAt: string;
  updatedAt: string;
};

/**
 * Creates an independent salon-local copy from a master library snapshot.
 * Persist via publishLibraryTemplateToSalon in salon-invite-local-copy-store.
 */
export function createSalonLocalCopy(
  snapshot: InviteTemplateSnapshot,
  salonId: string,
): SalonInviteLocalCopy {
  const now = new Date().toISOString();
  const copyId = `${salonId}-${snapshot.sourceTemplateId}-v${snapshot.version}`;

  return {
    id: copyId,
    salonId,
    sourceTemplateId: snapshot.sourceTemplateId,
    publishedVersion: snapshot.version,
    inventoryStatus: "published",
    snapshot: {
      ...snapshot,
      id: copyId,
      status: "published",
      createdAt: now,
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}
