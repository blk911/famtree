/**
 * npm run test:vmb:services
 */
import { ensureVmbStorageTables, resetVmbStorageBackendCache, resolveVmbStorageBackend } from "../lib/vmb/db";
import { buildPreviewFromTemplate } from "../lib/vmb/card-templates/apply-card-template";
import { getDefaultTemplate } from "../lib/vmb/card-templates/default-card-templates";
import { resolveOfferForTemplate } from "../lib/vmb/offers/offer-resolver";
import { getAllDefaultOffers, getDefaultOfferForCategory } from "../lib/vmb/offers/default-offers";
import { buildCardPreview } from "../lib/vmb/cards/card-template-engine";
import {
  getAllDefaultServiceOptions,
  getAllDefaultServices,
  getDefaultOptionsForService,
  getDefaultService,
} from "../lib/vmb/services/default-service-catalog";
import {
  archiveOption,
  archiveService,
  clearSalonServices,
  getOptionsForService,
  getServicesForSalon,
  SERVICE_POSTGRES_REQUIRED,
  upsertService,
  upsertServiceOption,
} from "../lib/vmb/services/service-store";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function testVercelWithoutDatabase(): Promise<void> {
  const prevVercel = process.env.VERCEL;
  const prevDb = process.env.DATABASE_URL;
  process.env.VERCEL = "1";
  delete process.env.DATABASE_URL;
  resetVmbStorageBackendCache();

  const result = await upsertService("salon-no-db", {
    ...getAllDefaultServices()[0],
    name: "Should not persist",
  });
  assert("error" in result, "Vercel without DATABASE_URL must not persist custom services");
  if ("error" in result) {
    assert(result.error === SERVICE_POSTGRES_REQUIRED, "returns SERVICE_POSTGRES_REQUIRED");
  }

  if (prevVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = prevVercel;
  if (prevDb) process.env.DATABASE_URL = prevDb;
  resetVmbStorageBackendCache();
}

async function run(): Promise<void> {
  await testVercelWithoutDatabase();

  const services = getAllDefaultServices();
  const options = getAllDefaultServiceOptions();
  assert(services.length >= 10, `expected seeded services, got ${services.length}`);
  assert(options.length >= 20, `expected seeded options, got ${options.length}`);

  const gelX = getDefaultService("default-nails-gel-x");
  assert(Boolean(gelX), "Gel-X default service exists");
  const gelXOptions = getDefaultOptionsForService("default-nails-gel-x");
  assert(gelXOptions.some((option) => option.name === "Chrome"), "Gel-X Chrome option exists");
  assert(gelXOptions.some((option) => option.name === "Long" && option.valueLabel === "+$10"), "pricing label on Long");

  const salonId = `service-test-${Date.now()}`;
  const catalog = await getServicesForSalon(salonId);
  assert(catalog.some((service) => service.name === "Gel-X"), "getServicesForSalon returns defaults");

  const gelXCatalogOptions = await getOptionsForService(salonId, "default-nails-gel-x");
  assert(gelXCatalogOptions.some((option) => option.name === "Pearls"), "getOptionsForService returns defaults");

  const birthdayOffer = getDefaultOfferForCategory("birthday");
  assert((birthdayOffer.serviceIds?.length ?? 0) > 0, "birthday offer references service");
  assert((birthdayOffer.serviceOptionIds?.length ?? 0) > 0, "birthday offer references service option");

  const birthdayTemplate = getDefaultTemplate("birthday_card");
  const linkedOffer = resolveOfferForTemplate(birthdayTemplate, getAllDefaultOffers());
  assert(linkedOffer?.name === "Birthday Treat", "template references birthday offer");

  const birthdayPreview = buildCardPreview({
    cardType: "birthday_card",
    recipientName: "Grace",
    salonName: "Blue Mountain Salon",
    techName: "Jenny",
    offers: getAllDefaultOffers(),
    services,
    serviceOptions: options,
  });
  assert(Boolean(birthdayPreview.offer), "card preview includes offer");
  assert(birthdayPreview.offer?.serviceName === "Gel-X", "card preview renders service name");
  assert(birthdayPreview.offer?.upgradeName === "Chrome", "card preview renders service upgrade");

  const templatePreview = buildPreviewFromTemplate(
    birthdayTemplate,
    {
      cardType: "birthday_card",
      recipientName: "Grace",
      salonName: "Blue Mountain Salon",
      techName: "Jenny",
      offers: getAllDefaultOffers(),
      services,
      serviceOptions: options,
    },
    "Jenny",
  );
  assert(templatePreview.offer?.upgradeName === "Chrome", "template preview resolves offer option");

  const customService = {
    ...gelX!,
    name: "Custom Gel-X",
    description: "Salon override",
  };
  const savedService = await upsertService(salonId, customService);
  if ("error" in savedService) {
    if (!process.env.DATABASE_URL?.trim()) {
      console.log("SKIP: postgres service override persistence (no DATABASE_URL)");
    } else {
      console.error("service save failed:", savedService.error);
      process.exit(1);
    }
  } else {
    const loaded = await getServicesForSalon(salonId);
    assert(loaded.some((service) => service.name === "Custom Gel-X"), "service override persists");

    const chrome = gelXCatalogOptions.find((option) => option.name === "Chrome");
    assert(Boolean(chrome), "chrome option available");
    if (chrome) {
      const savedOption = await upsertServiceOption(salonId, {
        ...chrome,
        valueLabel: "+$12",
      });
      assert(!("error" in savedOption), "option override persists");
      if (!("error" in savedOption)) {
        const archived = await archiveOption(salonId, savedOption.option.id);
        assert(!("error" in archived), "option archive works");
      }
    }

    const archivedService = await archiveService(salonId, savedService.service.id);
    assert(!("error" in archivedService), "service archive works");
  }

  if (process.env.DATABASE_URL?.trim()) {
    await ensureVmbStorageTables();
    const backend = await resolveVmbStorageBackend();
    assert(backend === "postgres", "postgres backend available when DATABASE_URL set");
  }

  await clearSalonServices(salonId);
  resetVmbStorageBackendCache();

  console.log("OK: VMB service catalog tests passed");
}

void run();
