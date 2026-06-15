import type { VmbServiceOption } from "./service-option-types";
import type { VmbService, VmbServiceCategory } from "./service-types";

const NOW = "2026-06-12T00:00:00.000Z";

function serviceId(category: VmbServiceCategory, slug: string): string {
  return `default-${category}-${slug}`;
}

function optionId(serviceKey: string, group: string, slug: string): string {
  return `${serviceKey}-${group.toLowerCase().replace(/\s+/g, "-")}-${slug}`;
}

function seedService(
  category: VmbServiceCategory,
  slug: string,
  name: string,
  displayOrder: number,
  description?: string,
): VmbService {
  return {
    id: serviceId(category, slug),
    category,
    name,
    description,
    active: true,
    displayOrder,
    isDefault: true,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function seedOption(
  service: VmbService,
  groupName: string,
  slug: string,
  name: string,
  displayOrder: number,
  valueLabel?: string,
  description?: string,
): VmbServiceOption {
  return {
    id: optionId(service.id, groupName, slug),
    serviceId: service.id,
    name,
    groupName,
    valueLabel,
    description,
    active: true,
    displayOrder,
    isDefault: true,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

const GEL_X = seedService("nails", "gel-x", "Gel-X", 1, "Hard gel extensions with a natural finish.");
const DIP = seedService("nails", "dip", "Dip", 2, "Dip powder manicure with durable color.");
const BUILDER_GEL = seedService("nails", "builder-gel", "Builder Gel", 3, "Structured builder gel overlay.");
const MANICURE = seedService("nails", "manicure", "Manicure", 4, "Classic manicure service.");
const PEDICURE = seedService("nails", "pedicure", "Pedicure", 5, "Classic pedicure service.");

const BROW_SHAPING = seedService("brows", "brow-shaping", "Brow Shaping", 10, "Custom brow shaping and cleanup.");
const BROW_TINT = seedService("brows", "brow-tint", "Brow Tint", 11, "Semi-permanent brow tint.");
const BROW_LAMINATION = seedService("brows", "brow-lamination", "Brow Lamination", 12, "Brow lamination and lift.");

const COLOR = seedService("hair", "color", "Color", 20, "Full color service.");
const HIGHLIGHTS = seedService("hair", "highlights", "Highlights", 21, "Highlight and dimension service.");
const EXTENSIONS = seedService("hair", "extensions", "Extensions", 22, "Hair extension installation.");

export const DEFAULT_SERVICES: VmbService[] = [
  GEL_X,
  DIP,
  BUILDER_GEL,
  MANICURE,
  PEDICURE,
  BROW_SHAPING,
  BROW_TINT,
  BROW_LAMINATION,
  COLOR,
  HIGHLIGHTS,
  EXTENSIONS,
];

export const DEFAULT_SERVICE_OPTIONS: VmbServiceOption[] = [
  seedOption(GEL_X, "Length", "short", "Short", 1),
  seedOption(GEL_X, "Length", "medium", "Medium", 2),
  seedOption(GEL_X, "Length", "long", "Long", 3, "+$10"),
  seedOption(GEL_X, "Length", "xl", "XL", 4, "+$15"),
  seedOption(GEL_X, "Art", "chrome", "Chrome", 10, "+$10", "Mirror chrome finish."),
  seedOption(GEL_X, "Art", "cat-eye", "Cat Eye", 11, "+$15", "Magnetic cat-eye effect."),
  seedOption(GEL_X, "Art", "pearls", "Pearls", 12, "+$20", "Pearl embellishment."),
  seedOption(GEL_X, "Repair", "repair", "Repair", 20, "+$5", "Single nail repair."),
  seedOption(GEL_X, "Repair", "soak-off", "Soak Off", 21, "+$10", "Gel removal add-on."),

  seedOption(DIP, "Finish", "french", "French Tip", 1, "+$5"),
  seedOption(DIP, "Finish", "chrome", "Chrome", 2, "+$10"),
  seedOption(DIP, "Repair", "repair", "Repair", 10, "+$5"),

  seedOption(BUILDER_GEL, "Length", "short", "Short", 1),
  seedOption(BUILDER_GEL, "Length", "medium", "Medium", 2),
  seedOption(BUILDER_GEL, "Length", "long", "Long", 3, "+$10"),
  seedOption(BUILDER_GEL, "Art", "chrome", "Chrome", 10, "+$10"),

  seedOption(MANICURE, "Add-On", "paraffin", "Paraffin", 1, "+$8"),
  seedOption(MANICURE, "Add-On", "gel-polish", "Gel Polish", 2, "+$12"),

  seedOption(PEDICURE, "Add-On", "paraffin", "Paraffin", 1, "+$10"),
  seedOption(PEDICURE, "Add-On", "callus", "Callus Treatment", 2, "+$8"),

  seedOption(BROW_SHAPING, "Style", "wax", "Wax", 1),
  seedOption(BROW_SHAPING, "Style", "thread", "Thread", 2, "+$5"),

  seedOption(BROW_TINT, "Tone", "light", "Light", 1),
  seedOption(BROW_TINT, "Tone", "medium", "Medium", 2),
  seedOption(BROW_TINT, "Tone", "dark", "Dark", 3),

  seedOption(BROW_LAMINATION, "Finish", "tint-combo", "Tint Combo", 1, "+$15"),

  seedOption(COLOR, "Coverage", "root-touch", "Root Touch-Up", 1),
  seedOption(COLOR, "Coverage", "full", "Full Color", 2, "+$40"),

  seedOption(HIGHLIGHTS, "Technique", "partial", "Partial Highlights", 1),
  seedOption(HIGHLIGHTS, "Technique", "full", "Full Highlights", 2, "+$50"),
  seedOption(HIGHLIGHTS, "Technique", "balayage", "Balayage", 3, "+$75"),

  seedOption(EXTENSIONS, "Method", "tape-in", "Tape-In", 1),
  seedOption(EXTENSIONS, "Method", "keratin", "Keratin Fusion", 2, "+$100"),
];

const SERVICE_BY_ID = new Map(DEFAULT_SERVICES.map((service) => [service.id, service]));
const OPTIONS_BY_SERVICE = new Map<string, VmbServiceOption[]>();

for (const option of DEFAULT_SERVICE_OPTIONS) {
  const list = OPTIONS_BY_SERVICE.get(option.serviceId) ?? [];
  list.push(option);
  OPTIONS_BY_SERVICE.set(option.serviceId, list);
}

export function getAllDefaultServices(): VmbService[] {
  return DEFAULT_SERVICES.map((service) => ({ ...service }));
}

export function getAllDefaultServiceOptions(): VmbServiceOption[] {
  return DEFAULT_SERVICE_OPTIONS.map((option) => ({ ...option }));
}

export function getDefaultService(serviceId: string): VmbService | undefined {
  const service = SERVICE_BY_ID.get(serviceId);
  return service ? { ...service } : undefined;
}

export function getDefaultOptionsForService(serviceId: string): VmbServiceOption[] {
  return (OPTIONS_BY_SERVICE.get(serviceId) ?? []).map((option) => ({ ...option }));
}

export const DEMO_BIRTHDAY_OFFER_SERVICE_IDS = [GEL_X.id];
export const DEMO_BIRTHDAY_OFFER_OPTION_IDS = [
  optionId(GEL_X.id, "Art", "chrome"),
];
