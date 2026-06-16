/**
 * npm run test:vmb:salon-offers
 */
import {
  calculateSalonOfferPriceCents,
  resolveOfferPriceCents,
} from "../lib/vmb/salon-offers/salon-offer-pricing";
import {
  createSalonOfferCatalogEntry,
  getEnabledSalonServicesForOffers,
  listSalonOfferCatalog,
  resolveSalonOfferDisplay,
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
  const calculated = calculateSalonOfferPriceCents(gelX, ["addon-chrome", "addon-crystals"]);
  assert(calculated === 8000 + 1500 + 1000, "offer price calculates service plus add-ons");

  const override = resolveOfferPriceCents(calculated, 11500);
  assert(override === 11500, "price override applies");

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

  const facing = await getSalonFacingServicesForCategory(salonId, "nails");
  assert(facing.length === 7, "services layer still loads full nails menu");

  console.log("OK: VMB salon offers tests passed");
}

void run();
