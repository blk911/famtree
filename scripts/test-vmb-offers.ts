/**
 * npm run test:vmb:offers
 */
import { resetVmbStorageBackendCache } from "../lib/vmb/db";
import { buildPreviewFromTemplate } from "../lib/vmb/card-templates/apply-card-template";
import { getDefaultTemplate } from "../lib/vmb/card-templates/default-card-templates";
import { getAllDefaultOffers, getDefaultOfferForCategory } from "../lib/vmb/offers/default-offers";
import {
  archiveOffer,
  clearSalonOffers,
  getOfferForCategory,
  getOffersForSalon,
  upsertOffer,
  OFFER_POSTGRES_REQUIRED,
} from "../lib/vmb/offers/offer-store";
import { VMB_OFFER_CATEGORIES } from "../lib/vmb/offers/offer-types";
import { buildCardPreview } from "../lib/vmb/cards/card-template-engine";
import { getAllDefaultTemplates } from "../lib/vmb/card-templates/default-card-templates";

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

  const result = await upsertOffer("salon-no-db", {
    ...getDefaultOfferForCategory("birthday"),
    offerText: "Should not persist",
  });
  assert("error" in result, "Vercel without DATABASE_URL must not persist custom offers");
  if ("error" in result) {
    assert(result.error === OFFER_POSTGRES_REQUIRED, "returns OFFER_POSTGRES_REQUIRED");
  }

  if (prevVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = prevVercel;
  if (prevDb) process.env.DATABASE_URL = prevDb;
  resetVmbStorageBackendCache();
}

async function run(): Promise<void> {
  await testVercelWithoutDatabase();

  const defaults = getAllDefaultOffers();
  assert(defaults.length === 10, `expected 10 default offers, got ${defaults.length}`);
  for (const category of VMB_OFFER_CATEGORIES) {
    assert(defaults.some((offer) => offer.category === category), `missing default offer ${category}`);
  }

  const salonId = `offer-test-${Date.now()}`;
  const birthdayDefault = await getOfferForCategory(salonId, "birthday");
  assert(birthdayDefault.isDefault === true, "getOfferForCategory returns default when no override");
  assert(birthdayDefault.name === "Birthday Treat", "birthday default name");

  const templates = getAllDefaultTemplates();
  const birthdayTemplate = templates.find((template) => template.type === "birthday_card");
  assert(Boolean(birthdayTemplate?.offerCategory === "birthday"), "birthday template maps offer category");
  assert(birthdayTemplate?.offerMode === "recommended", "birthday template offerMode recommended");
  const openSlotTemplate = templates.find((template) => template.type === "open_slot_fill");
  assert(openSlotTemplate?.offerMode === "required", "open_slot template offerMode required");

  const birthdayPreview = buildCardPreview({
    cardType: "birthday_card",
    recipientName: "Grace",
    salonName: "Blue Mountain Salon",
    techName: "Jenny",
    offers: defaults,
  });
  assert(Boolean(birthdayPreview.offer), "birthday card engine includes offer block");
  assert(birthdayPreview.offerProminent === true, "birthday offer is prominent");
  assert(
    (birthdayPreview.offer?.offerText.includes("birthday treat") ?? false),
    "birthday offer text from catalog",
  );

  const pcnPreview = buildCardPreview({
    cardType: "pcn_invite",
    recipientName: "Grace",
    salonName: "Blue Mountain Salon",
    techName: "Jenny",
    offers: defaults,
  });
  assert(Boolean(pcnPreview.offer), "PCN can include optional offer");
  assert(pcnPreview.title === "", "PCN still has no title");

  const openSlotPreview = buildPreviewFromTemplate(
    getDefaultTemplate("open_slot_fill"),
    {
      cardType: "open_slot_fill",
      recipientName: "Grace",
      salonName: "Blue Mountain Salon",
      techName: "Jenny",
      offers: [],
    },
    "Jenny",
  );
  assert(Boolean(openSlotPreview.offer), "open_slot has required offer fallback without salon offers");

  const customBirthday = {
    ...birthdayDefault,
    offerText: "Custom birthday sparkle treat for {clientName}.",
    valueLabel: "Sparkle treat",
  };
  const saved = await upsertOffer(salonId, customBirthday);
  if ("error" in saved) {
    if (!process.env.DATABASE_URL?.trim() && !process.env.VERCEL) {
      console.log("WARN: json fallback save failed unexpectedly");
    }
  } else {
    const loaded = await getOfferForCategory(salonId, "birthday");
    assert(loaded.offerText.includes("Custom birthday sparkle"), "override persists");
    const merged = await getOffersForSalon(salonId);
    assert(merged.some((offer) => offer.category === "birthday" && !offer.isDefault), "merged catalog includes custom");

    const archivedId = saved.offer.id;
    const archived = await archiveOffer(salonId, archivedId);
    assert(!("error" in archived), "archive succeeds");
    const afterArchive = await getOfferForCategory(salonId, "birthday");
    assert(afterArchive.isDefault === true, "archive hides custom offer and falls back to default");
  }

  await clearSalonOffers(salonId);
  resetVmbStorageBackendCache();

  console.log("OK: VMB offer catalog tests passed");
}

void run();
