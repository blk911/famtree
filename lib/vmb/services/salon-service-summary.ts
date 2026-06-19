import type { SalonFacingServiceOffer } from "@/lib/vmb/services/service-preset-types";

import type { SalonServiceLifecycleStatus } from "@/lib/vmb/services/salon-service-lifecycle";



export type SalonServiceEditorDraft = {

  priceCents: number;

  durationMinutes: number;

  addonIds: string[];

  addonPrices: Record<string, number>;

  status: SalonServiceLifecycleStatus;

};



export function formatSalonPrice(cents: number): string {

  return `$${Math.max(0, Math.round(cents / 100)).toLocaleString()}`;

}



export function formatSalonDuration(minutes: number): string {

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);

  const remainder = minutes % 60;

  if (remainder === 0) return `${hours} hr`;

  return `${hours} hr ${remainder} min`;

}



export function priceDiffersFromAdmin(salonCents: number, adminCents: number): boolean {

  return Math.round(salonCents) !== Math.round(adminCents);

}



export function formatSelectedAddonSummary(
  service: Pick<SalonFacingServiceOffer, "addons">,
  draft: Pick<SalonServiceEditorDraft, "addonIds" | "addonPrices">,
): string {
  const lines = listSelectedUpgradeLines(service, draft);
  if (lines.length === 0) return "No upgrades selected";
  return lines.join(" · ");
}

export function listSelectedUpgradeLines(
  service: Pick<SalonFacingServiceOffer, "addons">,
  draft: Pick<SalonServiceEditorDraft, "addonIds" | "addonPrices">,
): string[] {
  return service.addons
    .filter((addon) => draft.addonIds.includes(addon.addonId))
    .map((addon) => {
      const priceCents = draft.addonPrices[addon.addonId] ?? addon.priceCents;
      return `${addon.label} +${formatSalonPrice(priceCents)}`;
    });
}

export function calculateServiceRevenueSummary(
  draft: Pick<SalonServiceEditorDraft, "priceCents" | "addonIds" | "addonPrices">,
  service: Pick<SalonFacingServiceOffer, "addons">,
): {
  baseCents: number;
  upgradesCents: number;
  typicalTicketCents: number;
} {
  const baseCents = Math.max(0, Math.round(draft.priceCents));
  const upgradesCents = service.addons
    .filter((addon) => draft.addonIds.includes(addon.addonId))
    .reduce((sum, addon) => {
      const priceCents = draft.addonPrices[addon.addonId] ?? addon.priceCents;
      return sum + Math.max(0, Math.round(priceCents));
    }, 0);
  return {
    baseCents,
    upgradesCents,
    typicalTicketCents: baseCents + upgradesCents,
  };
}

export function formatSalonDurationMinutes(minutes: number): string {
  const value = Math.max(0, Math.round(minutes));
  return `${value} minute${value === 1 ? "" : "s"}`;
}



export function applyDraftToSalonService(

  service: SalonFacingServiceOffer,

  draft: SalonServiceEditorDraft,

  nextStatus?: SalonServiceLifecycleStatus,

): SalonFacingServiceOffer {

  return {

    ...service,

    priceCents: draft.priceCents,

    durationMinutes: draft.durationMinutes,

    status: nextStatus ?? draft.status,

    hasSalonConfig: nextStatus !== "draft",

    addons: service.addons.map((addon) => ({

      ...addon,

      enabled: draft.addonIds.includes(addon.addonId),

      priceCents: draft.addonPrices[addon.addonId] ?? addon.priceCents,

    })),

  };

}



export function listSummaryFromService(service: SalonFacingServiceOffer): {

  priceCents: number;

  durationMinutes: number;

  status: SalonServiceLifecycleStatus;

  addonSummary: string;

} {

  const draft = draftFromSalonService(service);

  return {

    priceCents: service.priceCents,

    durationMinutes: service.durationMinutes,

    status: service.status,

    addonSummary: formatSelectedAddonSummary(service, draft),

  };

}



export function draftFromSalonService(service: SalonFacingServiceOffer): SalonServiceEditorDraft {

  const addonPrices: Record<string, number> = {};

  for (const addon of service.addons) {

    addonPrices[addon.addonId] = addon.priceCents;

  }

  return {

    priceCents: service.priceCents,

    durationMinutes: service.durationMinutes,

    addonIds: service.addons.filter((addon) => addon.enabled).map((addon) => addon.addonId),

    addonPrices,

    status: service.status,

  };

}



export { salonServiceStatusLabel } from "@/lib/vmb/services/salon-service-lifecycle";


