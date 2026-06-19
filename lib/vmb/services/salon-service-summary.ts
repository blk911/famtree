import type { SalonFacingServiceOffer } from "@/lib/vmb/services/service-preset-types";

export type SalonServiceEditorDraft = {
  priceCents: number;
  durationMinutes: number;
  addonIds: string[];
  addonPrices: Record<string, number>;
  enabled: boolean;
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
  const selected = service.addons
    .filter((addon) => draft.addonIds.includes(addon.addonId))
    .map((addon) => {
      const priceCents = draft.addonPrices[addon.addonId] ?? addon.priceCents;
      return `${addon.label} +${formatSalonPrice(priceCents)}`;
    });

  if (selected.length === 0) return "No add-ons selected";
  return selected.join(" · ");
}

export function applyDraftToSalonService(
  service: SalonFacingServiceOffer,
  draft: SalonServiceEditorDraft,
): SalonFacingServiceOffer {
  return {
    ...service,
    priceCents: draft.priceCents,
    durationMinutes: draft.durationMinutes,
    enabled: draft.enabled,
    hasSalonConfig: true,
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
  enabled: boolean;
  addonSummary: string;
} {
  const draft = draftFromSalonService(service);
  return {
    priceCents: service.priceCents,
    durationMinutes: service.durationMinutes,
    enabled: service.enabled,
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
    enabled: service.enabled,
  };
}
