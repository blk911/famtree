import type { SalonFacingServiceOffer } from "@/lib/vmb/services/service-preset-types";

function safeCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export function calculateSalonOfferPriceCents(
  service: Pick<SalonFacingServiceOffer, "priceCents" | "addons">,
  addonIds: string[],
): number {
  const selected = new Set(addonIds);
  const addonTotal = service.addons
    .filter((addon) => addon.enabled && selected.has(addon.addonId))
    .reduce((sum, addon) => sum + safeCents(addon.priceCents), 0);
  return safeCents(safeCents(service.priceCents) + addonTotal);
}

export function resolveOfferPriceCents(
  calculatedPriceCents: number,
  priceOverrideCents?: number | null,
): number {
  if (typeof priceOverrideCents === "number" && Number.isFinite(priceOverrideCents) && priceOverrideCents >= 0) {
    return safeCents(priceOverrideCents);
  }
  return safeCents(calculatedPriceCents);
}

export function formatOfferPrice(cents: number): string {
  return `$${(safeCents(cents) / 100).toFixed(0)}`;
}
