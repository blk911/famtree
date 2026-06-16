import type { SalonFacingServiceOffer } from "@/lib/vmb/services/service-preset-types";

export function calculateSalonOfferPriceCents(
  service: Pick<SalonFacingServiceOffer, "priceCents" | "addons">,
  addonIds: string[],
): number {
  const selected = new Set(addonIds);
  const addonTotal = service.addons
    .filter((addon) => selected.has(addon.addonId))
    .reduce((sum, addon) => sum + addon.priceCents, 0);
  return service.priceCents + addonTotal;
}

export function resolveOfferPriceCents(
  calculatedPriceCents: number,
  priceOverrideCents?: number | null,
): number {
  if (typeof priceOverrideCents === "number" && priceOverrideCents >= 0) {
    return priceOverrideCents;
  }
  return calculatedPriceCents;
}

export function formatOfferPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}
