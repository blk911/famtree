/** Admin default nail service prices (USD). No salon override yet. */
export const DEFAULT_NAIL_SERVICE_PRICES: Record<string, number> = {
  "default-nails-gel-manicure": 60,
  "default-nails-builder-gel": 75,
  "default-nails-structured-gel": 80,
  "default-nails-gel-x": 90,
  "default-nails-acrylic-extensions": 95,
  "default-nails-smart-pedicure": 75,
  "default-nails-fill-refresh": 65,
};

/** Admin default nail add-on / perk prices (USD). Perks at $0 are included value. */
export const DEFAULT_NAIL_ADDON_PRICES: Record<string, number> = {
  "addon-chrome": 15,
  "addon-french": 12,
  "addon-crystals": 15,
  "addon-freestyle-art": 25,
  "offer-perk-priority-booking": 0,
  "offer-perk-complimentary-repair": 0,
  "offer-perk-removal-credit": 0,
  "addon-medium-length": 10,
  "addon-long-length": 20,
  "addon-xl-length": 35,
};

export function defaultNailServicePrice(serviceId: string): number {
  return DEFAULT_NAIL_SERVICE_PRICES[serviceId] ?? 0;
}

export function defaultNailAddonPrice(addonId: string): number {
  return DEFAULT_NAIL_ADDON_PRICES[addonId] ?? 0;
}
