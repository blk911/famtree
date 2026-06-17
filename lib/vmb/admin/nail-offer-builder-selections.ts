/** Curated nail offer builder choices — maps clean labels to underlying offer fields. */

export type NailOfferBuilderChoice = {
  id: string;
  label: string;
};

export const NAIL_OFFER_SERVICE_CHOICES: readonly NailOfferBuilderChoice[] = [
  { id: "default-nails-gel-manicure", label: "Gel Manicure" },
  { id: "default-nails-builder-gel", label: "Builder Gel" },
  { id: "default-nails-structured-gel", label: "Structured Gel" },
  { id: "default-nails-gel-x", label: "Gel-X Extensions" },
  { id: "default-nails-acrylic-extensions", label: "Acrylic Extensions" },
  { id: "default-nails-smart-pedicure", label: "Smart Pedicure" },
  { id: "default-nails-fill-refresh", label: "Fill & Refresh" },
] as const;

export const NAIL_OFFER_ADDON_CHOICES: readonly NailOfferBuilderChoice[] = [
  { id: "addon-chrome", label: "Chrome Upgrade" },
  { id: "addon-french", label: "French Design" },
  { id: "addon-freestyle-art", label: "Nail Art Credit" },
  { id: "addon-crystals", label: "Crystal Accent" },
  { id: "offer-perk-priority-booking", label: "Priority Booking" },
  { id: "offer-perk-complimentary-repair", label: "Complimentary Repair" },
  { id: "offer-perk-removal-credit", label: "Removal Credit" },
] as const;

const SERVICE_LABEL_BY_ID = new Map(NAIL_OFFER_SERVICE_CHOICES.map((row) => [row.id, row.label]));
const ADDON_LABEL_BY_ID = new Map(NAIL_OFFER_ADDON_CHOICES.map((row) => [row.id, row.label]));

function normalizeCatalogId(id: string): string {
  const match = id.match(/^[a-z0-9-]+-(default-.+)$/i);
  if (match?.[1]) return match[1];
  const addonMatch = id.match(/^[a-z0-9-]+-(addon-.+)$/i);
  if (addonMatch?.[1]) return addonMatch[1];
  const perkMatch = id.match(/^[a-z0-9-]+-(offer-perk-.+)$/i);
  if (perkMatch?.[1]) return perkMatch[1];
  return id;
}

export function labelForNailOfferServiceId(
  id: string,
  fallbackName?: string,
): string | undefined {
  const normalized = normalizeCatalogId(id);
  return SERVICE_LABEL_BY_ID.get(id) ?? SERVICE_LABEL_BY_ID.get(normalized) ?? fallbackName;
}

export function labelForNailOfferAddonId(
  id: string,
  fallbackName?: string,
): string | undefined {
  const normalized = normalizeCatalogId(id);
  return ADDON_LABEL_BY_ID.get(id) ?? ADDON_LABEL_BY_ID.get(normalized) ?? fallbackName;
}

export function resolveNailOfferServiceLabels(
  serviceIds: string[] | undefined,
  fallbackById: Record<string, string | undefined> = {},
): string[] {
  if (!serviceIds?.length) return [];
  return serviceIds
    .map((id) => labelForNailOfferServiceId(id, fallbackById[id]))
    .filter((label): label is string => Boolean(label));
}

export function resolveNailOfferAddonLabels(
  optionIds: string[] | undefined,
  fallbackById: Record<string, string | undefined> = {},
): string[] {
  if (!optionIds?.length) return [];
  return optionIds
    .map((id) => labelForNailOfferAddonId(id, fallbackById[id]))
    .filter((label): label is string => Boolean(label));
}

export function toggleOfferIdSelection(ids: string[] | undefined, id: string): string[] {
  const current = ids ?? [];
  return current.includes(id) ? current.filter((row) => row !== id) : [...current, id];
}
