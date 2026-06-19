import type {
  CatalogServiceOffer,
  CatalogServiceOfferWithAddons,
  OfferAddonMapEntry,
  ServiceAddon,
  ServiceCategory,
  ServiceCategoryId,
} from "./canonical-catalog-types";

function offerId(category: ServiceCategoryId, slug: string): string {
  return `default-${category}-${slug}`;
}

function addonId(slug: string): string {
  return `addon-${slug}`;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: "nails", name: "Nails", displayOrder: 1 },
  { id: "hair", name: "Hair", displayOrder: 2 },
  { id: "lashes", name: "Lashes", displayOrder: 3 },
  { id: "brows", name: "Brows", displayOrder: 4 },
  { id: "waxing", name: "Waxing", displayOrder: 5 },
  { id: "skin", name: "Skin", displayOrder: 6 },
  { id: "massage", name: "Massage", displayOrder: 7 },
  { id: "barber", name: "Barber", displayOrder: 8 },
];

export const SERVICE_ADDONS: ServiceAddon[] = [
  { id: addonId("medium-length"), name: "Medium Length", displayOrder: 1, active: true },
  { id: addonId("long-length"), name: "Long Length", displayOrder: 2, active: true },
  { id: addonId("xl-length"), name: "XL Length", displayOrder: 3, active: true },
  { id: addonId("french"), name: "French", displayOrder: 4, active: true },
  { id: addonId("chrome"), name: "Chrome", displayOrder: 5, active: true },
  { id: addonId("cat-eye"), name: "Cat Eye", displayOrder: 6, active: true },
  { id: addonId("aura"), name: "Aura", displayOrder: 7, active: true },
  { id: addonId("ombre"), name: "Ombre", displayOrder: 8, active: true },
  { id: addonId("crystals"), name: "Crystals", displayOrder: 9, active: true },
  { id: addonId("charms"), name: "Charms", displayOrder: 10, active: true },
  { id: addonId("freestyle-art"), name: "Freestyle Art", displayOrder: 11, active: true },
  { id: addonId("root-touch"), name: "Root Touch-Up", displayOrder: 20, active: true },
  { id: addonId("full-color"), name: "Full Color", displayOrder: 21, active: true },
  { id: addonId("classic-set"), name: "Classic Set", displayOrder: 30, active: true },
  { id: addonId("volume-set"), name: "Volume Set", displayOrder: 31, active: true },
  { id: addonId("brow-tint"), name: "Brow Tint", displayOrder: 40, active: true },
  { id: addonId("brow-lamination"), name: "Brow Lamination", displayOrder: 41, active: true },
];

export const SERVICE_OFFERS: CatalogServiceOffer[] = [
  // Nails
  {
    id: offerId("nails", "gel-manicure"),
    categoryId: "nails",
    name: "Gel Manicure",
    basePriceCents: 5500,
    durationMinutes: 45,
    displayOrder: 1,
    active: true,
  },
  {
    id: offerId("nails", "builder-gel"),
    categoryId: "nails",
    name: "Builder Gel",
    basePriceCents: 7000,
    durationMinutes: 60,
    displayOrder: 2,
    active: true,
  },
  {
    id: offerId("nails", "structured-gel"),
    categoryId: "nails",
    name: "Structured Gel",
    basePriceCents: 7500,
    durationMinutes: 75,
    displayOrder: 3,
    active: true,
  },
  {
    id: offerId("nails", "gel-x"),
    categoryId: "nails",
    name: "Gel-X Extensions",
    basePriceCents: 8000,
    durationMinutes: 90,
    description: "Hard gel extensions with a natural finish.",
    displayOrder: 4,
    active: true,
  },
  {
    id: offerId("nails", "acrylic-extensions"),
    categoryId: "nails",
    name: "Acrylic Extensions",
    basePriceCents: 8500,
    durationMinutes: 120,
    displayOrder: 5,
    active: true,
  },
  {
    id: offerId("nails", "smart-pedicure"),
    categoryId: "nails",
    name: "Smart Pedicure",
    basePriceCents: 6500,
    durationMinutes: 60,
    displayOrder: 6,
    active: true,
  },
  {
    id: offerId("nails", "fill-refresh"),
    categoryId: "nails",
    name: "Fill & Refresh",
    basePriceCents: 6000,
    durationMinutes: 75,
    displayOrder: 7,
    active: true,
  },
  // Hair
  {
    id: offerId("hair", "cut-style"),
    categoryId: "hair",
    name: "Cut & Style",
    basePriceCents: 6500,
    durationMinutes: 60,
    displayOrder: 1,
    active: true,
  },
  {
    id: offerId("hair", "color"),
    categoryId: "hair",
    name: "Color",
    basePriceCents: 12000,
    durationMinutes: 120,
    displayOrder: 2,
    active: true,
  },
  {
    id: offerId("hair", "highlights"),
    categoryId: "hair",
    name: "Highlights",
    basePriceCents: 15000,
    durationMinutes: 150,
    displayOrder: 3,
    active: true,
  },
  // Lashes
  {
    id: offerId("lashes", "classic-lash-set"),
    categoryId: "lashes",
    name: "Classic Lash Set",
    basePriceCents: 14000,
    durationMinutes: 120,
    displayOrder: 1,
    active: true,
  },
  {
    id: offerId("lashes", "volume-lash-set"),
    categoryId: "lashes",
    name: "Volume Lash Set",
    basePriceCents: 18000,
    durationMinutes: 150,
    displayOrder: 2,
    active: true,
  },
  // Brows
  {
    id: offerId("brows", "brow-shaping"),
    categoryId: "brows",
    name: "Brow Shaping",
    basePriceCents: 3500,
    durationMinutes: 30,
    displayOrder: 1,
    active: true,
  },
  {
    id: offerId("brows", "brow-tint"),
    categoryId: "brows",
    name: "Brow Tint",
    basePriceCents: 4000,
    durationMinutes: 30,
    displayOrder: 2,
    active: true,
  },
  {
    id: offerId("brows", "brow-lamination"),
    categoryId: "brows",
    name: "Brow Lamination",
    basePriceCents: 8500,
    durationMinutes: 45,
    displayOrder: 3,
    active: true,
  },
  // Waxing
  {
    id: offerId("waxing", "brow-wax"),
    categoryId: "waxing",
    name: "Brow Wax",
    basePriceCents: 2500,
    durationMinutes: 20,
    displayOrder: 1,
    active: true,
  },
  {
    id: offerId("waxing", "brazilian"),
    categoryId: "waxing",
    name: "Brazilian Wax",
    basePriceCents: 6500,
    durationMinutes: 45,
    displayOrder: 2,
    active: true,
  },
  // Skin
  {
    id: offerId("skin", "express-facial"),
    categoryId: "skin",
    name: "Express Facial",
    basePriceCents: 8500,
    durationMinutes: 45,
    displayOrder: 1,
    active: true,
  },
  {
    id: offerId("skin", "signature-facial"),
    categoryId: "skin",
    name: "Signature Facial",
    basePriceCents: 12000,
    durationMinutes: 75,
    displayOrder: 2,
    active: true,
  },
  // Massage
  {
    id: offerId("massage", "swedish-60"),
    categoryId: "massage",
    name: "Swedish Massage — 60 min",
    basePriceCents: 9500,
    durationMinutes: 60,
    displayOrder: 1,
    active: true,
  },
  {
    id: offerId("massage", "deep-tissue-60"),
    categoryId: "massage",
    name: "Deep Tissue — 60 min",
    basePriceCents: 11000,
    durationMinutes: 60,
    displayOrder: 2,
    active: true,
  },
  // Barber
  {
    id: offerId("barber", "haircut"),
    categoryId: "barber",
    name: "Haircut",
    basePriceCents: 4000,
    durationMinutes: 30,
    displayOrder: 1,
    active: true,
  },
  {
    id: offerId("barber", "beard-trim"),
    categoryId: "barber",
    name: "Beard Trim",
    basePriceCents: 2500,
    durationMinutes: 20,
    displayOrder: 2,
    active: true,
  },
];

const GEL_X_ID = offerId("nails", "gel-x");
const BUILDER_GEL_ID = offerId("nails", "builder-gel");
const STRUCTURED_GEL_ID = offerId("nails", "structured-gel");
const ACRYLIC_ID = offerId("nails", "acrylic-extensions");

const NAILS_ART_ADDON_IDS = [
  addonId("french"),
  addonId("chrome"),
  addonId("crystals"),
  addonId("freestyle-art"),
];

const NAILS_EXTENSION_ADDON_IDS = [
  ...NAILS_ART_ADDON_IDS,
  addonId("medium-length"),
  addonId("long-length"),
  addonId("xl-length"),
];

export const OFFER_ADDON_MAP: OfferAddonMapEntry[] = [
  ...NAILS_ART_ADDON_IDS.map((addon) => ({ serviceOfferId: BUILDER_GEL_ID, addonId: addon })),
  ...NAILS_ART_ADDON_IDS.map((addon) => ({ serviceOfferId: STRUCTURED_GEL_ID, addonId: addon })),
  ...NAILS_EXTENSION_ADDON_IDS.map((addon) => ({ serviceOfferId: ACRYLIC_ID, addonId: addon })),
  ...SERVICE_ADDONS.filter((addon) =>
    NAILS_EXTENSION_ADDON_IDS.includes(addon.id),
  ).map((addon) => ({ serviceOfferId: GEL_X_ID, addonId: addon.id })),
  { serviceOfferId: offerId("hair", "color"), addonId: addonId("root-touch") },
  { serviceOfferId: offerId("hair", "color"), addonId: addonId("full-color") },
  { serviceOfferId: offerId("lashes", "classic-lash-set"), addonId: addonId("classic-set") },
  { serviceOfferId: offerId("lashes", "volume-lash-set"), addonId: addonId("volume-set") },
  { serviceOfferId: offerId("brows", "brow-shaping"), addonId: addonId("brow-tint") },
  { serviceOfferId: offerId("brows", "brow-shaping"), addonId: addonId("brow-lamination") },
];

const CATEGORY_BY_ID = new Map(SERVICE_CATEGORIES.map((category) => [category.id, category]));
const OFFER_BY_ID = new Map(SERVICE_OFFERS.map((offer) => [offer.id, offer]));
const ADDON_BY_ID = new Map(SERVICE_ADDONS.map((addon) => [addon.id, addon]));
const ADDONS_BY_OFFER = new Map<string, string[]>();

for (const entry of OFFER_ADDON_MAP) {
  const list = ADDONS_BY_OFFER.get(entry.serviceOfferId) ?? [];
  list.push(entry.addonId);
  ADDONS_BY_OFFER.set(entry.serviceOfferId, list);
}

export function listServiceCategories(): ServiceCategory[] {
  return SERVICE_CATEGORIES.map((category) => ({ ...category }));
}

export function getServiceCategory(id: ServiceCategoryId): ServiceCategory | undefined {
  const category = CATEGORY_BY_ID.get(id);
  return category ? { ...category } : undefined;
}

export function getServiceCategoryLabel(id: ServiceCategoryId): string {
  return getServiceCategory(id)?.name ?? id;
}

export function listCatalogServiceOffers(categoryId?: ServiceCategoryId): CatalogServiceOffer[] {
  const offers = categoryId
    ? SERVICE_OFFERS.filter((offer) => offer.categoryId === categoryId && offer.active)
    : SERVICE_OFFERS.filter((offer) => offer.active);
  return offers.map((offer) => ({ ...offer })).sort((a, b) => a.displayOrder - b.displayOrder);
}

export function getCatalogServiceOffer(id: string): CatalogServiceOffer | undefined {
  const offer = OFFER_BY_ID.get(id);
  return offer ? { ...offer } : undefined;
}

export function listServiceAddons(): ServiceAddon[] {
  return SERVICE_ADDONS.filter((addon) => addon.active).map((addon) => ({ ...addon }));
}

export function getServiceAddon(id: string): ServiceAddon | undefined {
  const addon = ADDON_BY_ID.get(id);
  return addon ? { ...addon } : undefined;
}

export function listAddonsForServiceOffer(serviceOfferId: string): ServiceAddon[] {
  const ids = ADDONS_BY_OFFER.get(serviceOfferId) ?? [];
  return ids
    .map((id) => ADDON_BY_ID.get(id))
    .filter((addon): addon is ServiceAddon => Boolean(addon?.active))
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((addon) => ({ ...addon }));
}

export function getCatalogServiceOfferWithAddons(id: string): CatalogServiceOfferWithAddons | undefined {
  const offer = getCatalogServiceOffer(id);
  if (!offer) return undefined;
  return {
    ...offer,
    addonIds: (ADDONS_BY_OFFER.get(id) ?? []).slice(),
  };
}

export function formatCatalogPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export function formatCatalogDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
}

/** Birthday demo offer — stable Gel-X + Chrome addon IDs. */
export const DEMO_BIRTHDAY_OFFER_SERVICE_IDS = [GEL_X_ID];
export const DEMO_BIRTHDAY_OFFER_ADDON_IDS = [addonId("chrome")];
