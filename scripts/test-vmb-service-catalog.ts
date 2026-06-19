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
  getActiveSalonFacingServicesForCategory,
  getSalonServiceConfig,
  getSalonServicesForCategory,
  upsertSalonServiceConfig,
} from "../lib/vmb/services/salon-service-config-store";
import { listServicePresetCards } from "../lib/vmb/services/service-preset-store";
import {
  applyDraftToSalonService,
  draftFromSalonService,
  formatSelectedAddonSummary,
  listSummaryFromService,
  priceDiffersFromAdmin,
} from "../lib/vmb/services/salon-service-summary";
import {
  activeSalonServiceIdSet,
  publishedCopyEligibleForActiveServices,
  resolveSalonServiceStatus,
  resolveStatusAfterLifecycleAction,
} from "../lib/vmb/services/salon-service-lifecycle";
import { buildServiceTemplateParticipation } from "../lib/vmb/invites/service-template-participation";

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
  assert(menu.every((service) => !service.enabled), "resolved menu keeps legacy enabled false until active");

  assert(resolveStatusAfterLifecycleAction("draft", "save") === "configured", "save moves draft to configured");
  assert(resolveStatusAfterLifecycleAction("configured", "activate") === "active", "activate moves configured to active");
  assert(
    resolveStatusAfterLifecycleAction("active", "deactivate") === "configured",
    "deactivate moves active to configured",
  );
  assert(
    typeof resolveStatusAfterLifecycleAction("draft", "activate") === "object",
    "activate requires saved configuration",
  );

  const facing = await getSalonFacingServicesForCategory(salonId, "nails");
  assert(
    facing.every((service) => service.status === "draft"),
    "facing services start as draft until salon saves configuration",
  );
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

  const builderFacingBase = facing.find((service) => service.serviceOfferId === "default-nails-builder-gel")!;
  const activeDraft = {
    ...draftFromSalonService(builderFacingBase),
    status: "active" as const,
    priceCents: 7000,
    durationMinutes: 60,
    addonIds: ["addon-chrome", "addon-crystals"],
    addonPrices: { "addon-chrome": 1500, "addon-crystals": 1500 },
  };
  const activeSaved = applyDraftToSalonService(builderFacingBase, activeDraft, "active");
  const activeSummary = listSummaryFromService(activeSaved);
  assert(activeSummary.status === "active", "activating service updates summary status");
  assert(activeSummary.priceCents === 7000, "activating service updates summary price");
  assert(
    activeSummary.addonSummary.includes("Chrome +$15"),
    "selected add-ons appear on card summary after save",
  );
  assert(
    activeSummary.addonSummary.includes("Crystals +$15"),
    "multiple selected add-ons appear on card summary after save",
  );

  const overrideDraft = {
    ...activeDraft,
    addonPrices: { "addon-chrome": 1800, "addon-crystals": 1500 },
  };
  const overrideSaved = applyDraftToSalonService(builderFacingBase, overrideDraft, "active");
  const overrideSummary = listSummaryFromService(overrideSaved);
  assert(
    overrideSummary.addonSummary.includes("Chrome +$18"),
    "add-on price override appears on card summary after save",
  );
  assert(
    formatSelectedAddonSummary(
      { addons: builderFacingBase.addons },
      { addonIds: [], addonPrices: {} },
    ) === "No add-ons selected",
    "empty add-on selection shows no add-ons selected",
  );
  assert(!priceDiffersFromAdmin(1500, 1500), "admin default note hidden when salon price matches admin");
  assert(priceDiffersFromAdmin(1800, 1500), "admin default note shown when salon price differs from admin");

  const saved = await upsertSalonServiceConfig(salonId, {
    catalogServiceId: "default-nails-gel-manicure",
    lifecycleAction: "save",
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
    const configuredFacing = await getSalonFacingServicesForCategory(salonId, "nails");
    const gelManiFacing = configuredFacing.find(
      (service) => service.serviceOfferId === "default-nails-gel-manicure",
    );
    assert(gelManiFacing?.status === "configured", "save moves gel manicure to configured");
    assert(gelManiFacing?.priceCents === 6000, "salon price override persists on save");

    const activated = await upsertSalonServiceConfig(salonId, {
      catalogServiceId: "default-nails-gel-manicure",
      lifecycleAction: "activate",
    });
    if ("error" in activated) {
      console.error("activate failed:", activated.error);
      process.exit(1);
    }

    const updated = await getSalonServicesForCategory(salonId, "nails");
    const gelMani = updated.find((service) => service.id === "default-nails-gel-manicure");
    assert(gelMani?.enabled === true, "active service exposes legacy enabled true");
    assert(resolveSalonServiceStatus(activated.config) === "active", "activate persists active status");

    const gelConfig = await getSalonServiceConfig(salonId, "default-nails-gel-manicure");
    const priceOnlySave = await upsertSalonServiceConfig(salonId, {
      catalogServiceId: "default-nails-gel-manicure",
      lifecycleAction: "save",
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
    assert(gelAfter?.enabled === true, "saving active service keeps active state");
    assert(gelAfter?.priceCents === 6200, "salon price update persists");

    const builderSaved = await upsertSalonServiceConfig(salonId, {
      catalogServiceId: "default-nails-builder-gel",
      lifecycleAction: "save",
      priceCents: 7500,
      durationMinutes: 60,
      enabledAddonIds: ["addon-chrome"],
      addonPriceCentsById: { "addon-chrome": 1800 },
    });
    if ("error" in builderSaved) {
      console.error("builder gel save failed:", builderSaved.error);
      process.exit(1);
    }
    const builderActivated = await upsertSalonServiceConfig(salonId, {
      catalogServiceId: "default-nails-builder-gel",
      lifecycleAction: "activate",
    });
    if ("error" in builderActivated) {
      console.error("builder gel activate failed:", builderActivated.error);
      process.exit(1);
    }
    const reloadedFacing = await getSalonFacingServicesForCategory(salonId, "nails");
    const builderFacing = reloadedFacing.find(
      (service) => service.serviceOfferId === "default-nails-builder-gel",
    );
    assert(builderFacing?.status === "active", "builder gel active state persists after reload");
    assert(builderFacing?.hasSalonConfig === true, "builder gel marks salon config after save");
    assert(builderFacing?.priceCents === 7500, "builder gel salon price persists after reload");

    const gelXSaved = await upsertSalonServiceConfig(salonId, {
      catalogServiceId: "default-nails-gel-x",
      lifecycleAction: "save",
      priceCents: 8800,
      durationMinutes: 90,
      enabledAddonIds: ["addon-chrome"],
      addonPriceCentsById: { "addon-chrome": 1600 },
    });
    if ("error" in gelXSaved) {
      console.error("gel-x save failed:", gelXSaved.error);
      process.exit(1);
    }
    const gelXActivated = await upsertSalonServiceConfig(salonId, {
      catalogServiceId: "default-nails-gel-x",
      lifecycleAction: "activate",
    });
    if ("error" in gelXActivated) {
      console.error("gel-x activate failed:", gelXActivated.error);
      process.exit(1);
    }
    const gelXReloaded = await getSalonFacingServicesForCategory(salonId, "nails");
    const gelXFacing = gelXReloaded.find((service) => service.serviceOfferId === "default-nails-gel-x");
    assert(gelXFacing?.status === "active", "gel-x active status persists after reload");
    assert(gelXFacing?.priceCents === 8800, "gel-x base price persists after reload");
    assert(
      gelXFacing?.addons.some((addon) => addon.addonId === "addon-chrome" && addon.enabled),
      "gel-x chrome add-on toggle persists after reload",
    );
    assert(
      gelXFacing?.addons.find((addon) => addon.addonId === "addon-chrome")?.priceCents === 1600,
      "gel-x chrome add-on price persists after reload",
    );

    const deactivated = await upsertSalonServiceConfig(salonId, {
      catalogServiceId: "default-nails-gel-x",
      lifecycleAction: "deactivate",
    });
    if ("error" in deactivated) {
      console.error("gel-x deactivate failed:", deactivated.error);
      process.exit(1);
    }
    const gelXConfigured = await getSalonFacingServicesForCategory(salonId, "nails");
    const gelXAfterDeactivate = gelXConfigured.find(
      (service) => service.serviceOfferId === "default-nails-gel-x",
    );
    assert(gelXAfterDeactivate?.status === "configured", "deactivate moves gel-x back to configured");
    assert(gelXAfterDeactivate?.priceCents === 8800, "deactivate preserves gel-x pricing");

    const activeOnly = await getActiveSalonFacingServicesForCategory(salonId, "nails");
    assert(
      activeOnly.every((service) => service.status === "active"),
      "client-facing menu includes only active services",
    );
    assert(
      !activeOnly.some((service) => service.serviceOfferId === "default-nails-gel-x"),
      "deactivated gel-x is hidden from client-facing menu",
    );

    const activeIds = activeSalonServiceIdSet(activeOnly.map((service) => service.serviceOfferId));
    assert(
      !publishedCopyEligibleForActiveServices(["default-nails-gel-x"], activeIds),
      "invitation matching excludes configured-only services",
    );
    assert(
      publishedCopyEligibleForActiveServices(["default-nails-builder-gel"], activeIds),
      "invitation matching includes active services",
    );
    assert(
      Object.keys(buildServiceTemplateParticipation([], { activeServiceIds: activeIds })).length === 0,
      "participation map respects active service filter",
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
  assert(salonServicesClient.includes("applyDraftToSalonService"), "salon services updates local state after save");
  assert(!salonServicesClient.includes("ServicePresetCard"), "salon services removes per-card save layout");

  assert(salonServicesClient.includes("lifecycleAction"), "salon services uses lifecycle save/activate/deactivate");
  assert(!salonServicesClient.includes("enabled: draft.enabled"), "salon services no longer saves enable toggle");

  const salonServiceEditor = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/salon/SalonServiceEditor.tsx"),
    "utf8",
  );
  assert(salonServiceEditor.includes("addonPriceDiffers"), "add-on admin default only when price differs");
  assert(salonServiceEditor.includes("Price</span>"), "add-on price label is simple Price");
  assert(!salonServiceEditor.includes("Add-on price"), "add-on price label removes verbose wording");

  assert(salonServiceEditor.includes("Activate Service"), "editor exposes activate action");
  assert(salonServiceEditor.includes("Deactivate Service"), "editor exposes deactivate action");
  assert(!salonServiceEditor.includes("Enable this service"), "editor removes legacy enable wording");

  const salonServiceListItem = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/salon/SalonServiceListItem.tsx"),
    "utf8",
  );
  assert(salonServiceListItem.includes("formatSelectedAddonSummary"), "service list card summarizes add-ons");
  assert(salonServiceListItem.includes("vmb-salon-services__list-addons"), "service list card shows add-on summary line");

  const salonServicesCss = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
  assert(
    salonServicesCss.includes("grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)"),
    "salon services layout uses equal 50/50 columns on desktop",
  );
  assert(salonServiceListItem.includes("salonServiceStatusLabel"), "service list card shows lifecycle status badge");
  assert(salonServicesCss.includes("status-badge--active"), "active badge uses green styling");
  assert(salonServicesCss.includes("status-badge--configured"), "configured badge uses amber styling");

  console.log("OK: VMB service catalog tests passed");
}

void run();
