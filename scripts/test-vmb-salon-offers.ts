/**
 * npm run test:vmb:salon-offers
 */
import {
  calculateSalonOfferPriceCents,
  formatOfferPrice,
  resolveOfferPriceCents,
} from "../lib/vmb/salon-offers/salon-offer-pricing";
import {
  createSalonOfferCatalogEntry,
  getEnabledSalonServicesForOffers,
  listSalonOfferCatalog,
  resolveSalonOfferDisplay,
  updateSalonOfferCatalogEntry,
} from "../lib/vmb/salon-offers/salon-offer-catalog-store";
import { getSalonFacingServicesForCategory, upsertSalonServiceConfig } from "../lib/vmb/services/salon-service-config-store";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function run(): Promise<void> {
  const salonId = `salon-offers-${Date.now()}`;

  await upsertSalonServiceConfig(salonId, {
    catalogServiceId: "default-nails-gel-x",
    enabled: true,
    priceCents: 8000,
    durationMinutes: 90,
    enabledAddonIds: ["addon-chrome", "addon-crystals"],
  });

  const enabled = await getEnabledSalonServicesForOffers(salonId);
  assert(enabled.some((service) => service.serviceOfferId === "default-nails-gel-x"), "enabled services include Gel-X");

  const gelX = enabled.find((service) => service.serviceOfferId === "default-nails-gel-x")!;
  const disabledAddonId = gelX.addons.find((addon) => !addon.enabled)?.addonId;
  assert(Boolean(disabledAddonId), "salon service exposes at least one disabled add-on for validation");
  const calculated = calculateSalonOfferPriceCents(gelX, ["addon-chrome", "addon-crystals"]);
  assert(calculated === 8000 + 1500 + 1500, "offer price calculates service plus add-ons");

  const override = resolveOfferPriceCents(calculated, 11500);
  assert(override === 11500, "price override applies");

  assert(formatOfferPrice(Number.NaN) === "$0", "formatOfferPrice never returns NaN");
  assert(
    calculateSalonOfferPriceCents({ priceCents: Number.NaN, addons: [] }, []) === 0,
    "calculateSalonOfferPriceCents guards NaN",
  );

  const disabledAddonBlocked = await createSalonOfferCatalogEntry(salonId, {
    name: "Bad Add-on",
    description: "Should fail",
    serviceId: "default-nails-gel-x",
    addonIds: [disabledAddonId!],
  });
  assert("error" in disabledAddonBlocked, "disabled add-ons cannot be used in offers");

  const created = await createSalonOfferCatalogEntry(salonId, {
    name: "Birthday Babe",
    description: "A fun birthday nail set featuring chrome shine and crystal accents.",
    serviceId: "default-nails-gel-x",
    addonIds: ["addon-chrome", "addon-crystals"],
    priceOverrideCents: 11500,
  });

  if ("error" in created) {
    if (!process.env.DATABASE_URL?.trim()) {
      console.log("SKIP: salon offer persistence (no DATABASE_URL)");
      console.log("OK: VMB salon offers tests passed (in-memory pricing only)");
      return;
    }
    console.error("create offer failed:", created.error);
    process.exit(1);
  }

  const list = await listSalonOfferCatalog(salonId);
  assert(list.length === 1, "salon offer list returns one offer");
  assert(list[0]?.name === "Birthday Babe", "offer name persisted");
  assert(list[0]?.priceCents === 11500, "offer override price persisted");
  assert(list[0]?.serviceId === "default-nails-gel-x", "offer links to canonical service id");

  const display = await resolveSalonOfferDisplay(salonId, created.entry.id);
  assert(Boolean(display?.includedLines.some((line) => line.includes("Chrome"))), "display includes addon labels");

  await upsertSalonServiceConfig(salonId, {
    catalogServiceId: "default-nails-gel-x",
    enabled: false,
  });

  const displayAfterDisable = await resolveSalonOfferDisplay(salonId, created.entry.id);
  assert(Boolean(displayAfterDisable?.serviceUnavailable), "display warns when service unavailable");
  assert(Boolean(displayAfterDisable?.serviceWarning), "display includes service warning");
  assert(!displayAfterDisable?.includedLines.some((line) => line.includes("default-nails")), "display never exposes service ids");

  const renamed = await updateSalonOfferCatalogEntry(salonId, created.entry.id, {
    name: "Birthday Babe (updated)",
  });
  assert(!("error" in renamed), "offer metadata can update when service is unavailable");

  const facing = await getSalonFacingServicesForCategory(salonId, "nails");
  assert(facing.length === 7, "services layer still loads full nails menu");

  console.log("OK: VMB salon offers tests passed");
}

void run();
