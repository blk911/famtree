/**
 * npm run test:vmb:service-catalog
 */
import fs from "node:fs";
import path from "node:path";
import {
  getCatalogServiceOffer,
  listCatalogServiceOffers,
  listServiceCategories,
  listAddonsForServiceOffer,
  OFFER_ADDON_MAP,
} from "../lib/vmb/services/canonical-service-catalog";
import { DEFAULT_NAILS_SERVICE_PRESETS } from "../lib/vmb/services/default-service-presets";
import {
  mergePresetWithSalonConfig,
  mergePresetsWithSalonConfigs,
} from "../lib/vmb/services/merge-salon-service-offers";
import {
  getSalonFacingServicesForCategory,
  getSalonServiceConfig,
  getSalonServicesForCategory,
  upsertSalonServiceConfig,
} from "../lib/vmb/services/salon-service-config-store";
import { listServicePresetCards } from "../lib/vmb/services/service-preset-store";

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

  assert(DEFAULT_NAILS_SERVICE_PRESETS.length === 7, "seven nails preset cards seeded");
  for (const preset of DEFAULT_NAILS_SERVICE_PRESETS) {
    const offer = getCatalogServiceOffer(preset.serviceOfferId);
    assert(Boolean(offer), `preset ${preset.id} maps to valid serviceOfferId`);
    assert(offer!.categoryId === preset.categoryId, `preset ${preset.id} category matches canonical offer`);
    const allowed = new Set(listAddonsForServiceOffer(preset.serviceOfferId).map((addon) => addon.id));
    for (const addon of preset.addonPresets) {
      assert(allowed.has(addon.addonId), `preset ${preset.id} addon ${addon.addonId} is allowed for offer`);
    }
  }

  const nailsPresets = await listServicePresetCards("nails");
  assert(nailsPresets.length === 7, "preset store returns seven active nails cards");
  assert(
    nailsPresets.some((preset) => preset.displayName === "Gel-X Extensions"),
    "Gel-X preset card display name seeded",
  );

  const salonId = `catalog-salon-${Date.now()}`;
  const menu = await getSalonServicesForCategory(salonId, "nails");
  assert(menu.length === 7, "salon menu loads nails services from catalog");
  assert(menu.every((service) => !service.enabled), "services start disabled until salon enables");

  const facing = await getSalonFacingServicesForCategory(salonId, "nails");
  assert(facing.length === 7, "salon facing services merge presets with defaults");
  const gelXPreset = facing.find((service) => service.serviceOfferId === "default-nails-gel-x");
  assert(gelXPreset?.displayName === "Gel-X Extensions", "facing service uses preset display name");
  assert(Boolean(gelXPreset?.includedText.includes("Nail prep")), "facing service includes preset included text");
  assert(
    Boolean(gelXPreset?.addons.some((addon) => addon.label === "Chrome" && addon.priceCents === 1500)),
    "facing service includes priced addon presets",
  );

  const merged = mergePresetsWithSalonConfigs(nailsPresets, []);
  assert(merged.length === 7, "client merge helper returns seven services");
  const gelMerged = mergePresetWithSalonConfig(
    nailsPresets.find((preset) => preset.serviceOfferId === "default-nails-gel-manicure")!,
    undefined,
  );
  assert(gelMerged.priceCents === 5500, "merge uses preset base price when no salon config saved");

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

    const gelConfig = await getSalonServiceConfig(salonId, "default-nails-gel-manicure");
    const priceOnlySave = await upsertSalonServiceConfig(salonId, {
      catalogServiceId: "default-nails-gel-manicure",
      enabled: true,
      priceCents: 6200,
      durationMinutes: gelConfig!.durationMinutes,
      enabledAddonIds: gelConfig!.enabledAddonIds,
    });
    if ("error" in priceOnlySave) {
      console.error("partial save failed:", priceOnlySave.error);
      process.exit(1);
    }
    const afterPartial = await getSalonServicesForCategory(salonId, "nails");
    const gelAfter = afterPartial.find((service) => service.id === "default-nails-gel-manicure");
    assert(gelAfter?.enabled === true, "saving salon config does not reset enabled state");
    assert(gelAfter?.priceCents === 6200, "salon price update persists");
  }

  const servicesPage = path.join(process.cwd(), "app", "vmb", "services", "page.tsx");
  const servicesPageSource = fs.readFileSync(servicesPage, "utf8");
  assert(
    servicesPageSource.includes("/vmb/service-presets"),
    "/vmb/services redirect still points to /vmb/service-presets",
  );

  console.log("OK: VMB service catalog tests passed");
}

void run();
