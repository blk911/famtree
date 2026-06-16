/**
 * npm run test:vmb:service-catalog
 */
import {
  getCatalogServiceOffer,
  listCatalogServiceOffers,
  listServiceCategories,
  listAddonsForServiceOffer,
  OFFER_ADDON_MAP,
} from "../lib/vmb/services/canonical-service-catalog";
import { getSalonServicesForCategory, upsertSalonServiceConfig } from "../lib/vmb/services/salon-service-config-store";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function run(): Promise<void> {
  assert(listServiceCategories().length === 8, "eight service categories defined");
  assert(listCatalogServiceOffers("nails").length === 7, "nails category has seven services");

  const gelX = getCatalogServiceOffer("default-nails-gel-x");
  assert(gelX?.name === "Gel-X Extensions", "stable Gel-X service id preserved");
  assert(gelX?.basePriceCents === 8000, "Gel-X base price seeded");

  const addons = listAddonsForServiceOffer("default-nails-gel-x");
  assert(addons.some((addon) => addon.name === "French"), "Gel-X includes French addon");
  assert(addons.some((addon) => addon.name === "Freestyle Art"), "Gel-X includes Freestyle Art addon");
  assert(
    OFFER_ADDON_MAP.some(
      (entry) => entry.serviceOfferId === "default-nails-gel-x" && entry.addonId === "addon-chrome",
    ),
    "offer_addon_map links Gel-X to Chrome",
  );

  const salonId = `catalog-salon-${Date.now()}`;
  const menu = await getSalonServicesForCategory(salonId, "nails");
  assert(menu.length === 7, "salon menu loads nails services from catalog");
  assert(menu.every((service) => !service.enabled), "services start disabled until salon enables");

  const saved = await upsertSalonServiceConfig(salonId, {
    catalogServiceId: "default-nails-gel-manicure",
    enabled: true,
    priceCents: 6000,
    durationMinutes: 50,
    enabledAddonIds: [],
  });
  if ("error" in saved) {
    if (!process.env.DATABASE_URL?.trim()) {
      console.log("SKIP: salon service config persistence (no DATABASE_URL)");
    } else {
      console.error("salon config save failed:", saved.error);
      process.exit(1);
    }
  } else {
    const updated = await getSalonServicesForCategory(salonId, "nails");
    const gelMani = updated.find((service) => service.id === "default-nails-gel-manicure");
    assert(gelMani?.enabled === true, "salon enables gel manicure");
    assert(gelMani?.priceCents === 6000, "salon price override persists");
  }

  console.log("OK: VMB service catalog tests passed");
}

void run();
