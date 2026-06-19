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
  hasSalonSavedConfig,
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
  assert(typeof gelXPreset?.adminBasePriceCents === "number", "facing service exposes admin default price");
  assert(gelXPreset?.hasSalonConfig === false, "unsaved facing service is not marked as salon override");

  const builderPreset = nailsPresets.find((preset) => preset.serviceOfferId === "default-nails-builder-gel");
  assert((builderPreset?.addonPresets.length ?? 0) > 0, "builder gel preset includes add-ons");

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

    const builderSaved = await upsertSalonServiceConfig(salonId, {
      catalogServiceId: "default-nails-builder-gel",
      enabled: true,
      priceCents: 7500,
      durationMinutes: 60,
      enabledAddonIds: ["addon-chrome"],
      addonPriceCentsById: { "addon-chrome": 1800 },
    });
    if ("error" in builderSaved) {
      console.error("builder gel save failed:", builderSaved.error);
      process.exit(1);
    }
    const reloadedFacing = await getSalonFacingServicesForCategory(salonId, "nails");
    const builderFacing = reloadedFacing.find(
      (service) => service.serviceOfferId === "default-nails-builder-gel",
    );
    assert(builderFacing?.enabled === true, "builder gel enabled state persists after reload");
    assert(builderFacing?.hasSalonConfig === true, "builder gel marks salon config after save");
    assert(builderFacing?.priceCents === 7500, "builder gel salon price persists after reload");

    const gelXSaved = await upsertSalonServiceConfig(salonId, {
      catalogServiceId: "default-nails-gel-x",
      enabled: true,
      priceCents: 8800,
      durationMinutes: 90,
      enabledAddonIds: ["addon-chrome"],
      addonPriceCentsById: { "addon-chrome": 1600 },
    });
    if ("error" in gelXSaved) {
      console.error("gel-x save failed:", gelXSaved.error);
      process.exit(1);
    }
    const gelXReloaded = await getSalonFacingServicesForCategory(salonId, "nails");
    const gelXFacing = gelXReloaded.find((service) => service.serviceOfferId === "default-nails-gel-x");
    assert(gelXFacing?.priceCents === 8800, "gel-x base price persists after reload");
    assert(
      gelXFacing?.addons.some((addon) => addon.addonId === "addon-chrome" && addon.enabled),
      "gel-x chrome add-on toggle persists after reload",
    );
    assert(
      gelXFacing?.addons.find((addon) => addon.addonId === "addon-chrome")?.priceCents === 1600,
      "gel-x chrome add-on price persists after reload",
    );

    const storedBuilderConfig = (await getSalonServiceConfig(salonId, "default-nails-builder-gel"))!;
    assert(hasSalonSavedConfig(storedBuilderConfig), "stored builder gel config is marked saved");
  }

  const servicesPage = path.join(process.cwd(), "app", "vmb", "services", "page.tsx");
  const servicesPageSource = fs.readFileSync(servicesPage, "utf8");
  assert(
    servicesPageSource.includes("/vmb/service-presets"),
    "/vmb/services redirect still points to /vmb/service-presets",
  );

  const serviceCatalogClient = path.join(
    process.cwd(),
    "components/vmb/admin/PlatformServiceCatalogClient.tsx",
  );
  const serviceCatalogSource = fs.readFileSync(serviceCatalogClient, "utf8");
  assert(serviceCatalogSource.includes("AdminBuilderShell"), "service catalog uses builder shell");
  assert(serviceCatalogSource.includes("vmb-admin-builder-grid"), "service catalog uses three-column builder grid");
  assert(serviceCatalogSource.includes("vmb-admin-builder-grid__preview"), "service detail uses preview column");
  assert(serviceCatalogSource.includes("flowActions"), "service catalog preset link uses flow action area");

  const salonServicesClient = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/salon/SalonServicesClient.tsx"),
    "utf8",
  );
  assert(salonServicesClient.includes("vmb-salon-services__layout"), "salon services uses two-column layout");
  assert(salonServicesClient.includes("SalonServiceEditor"), "salon services uses selected service editor");
  assert(salonServicesClient.includes('fetch("/api/vmb/salon-services"'), "salon services loads merged salon menu");
  assert(!salonServicesClient.includes("ServicePresetCard"), "salon services removes per-card save layout");

  console.log("OK: VMB service catalog tests passed");
}

void run();
