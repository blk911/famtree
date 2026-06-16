export type VmbServiceCategory =
  | "nails"
  | "hair"
  | "lashes"
  | "brows"
  | "waxing"
  | "skin"
  | "massage"
  | "barber";

export const VMB_SERVICE_CATEGORIES: readonly VmbServiceCategory[] = [
  "nails",
  "hair",
  "lashes",
  "brows",
  "waxing",
  "skin",
  "massage",
  "barber",
] as const;

/** @deprecated Use `skin` — kept for legacy payload reads. */
export type LegacyVmbServiceCategory = VmbServiceCategory | "facial" | "other";

export function normalizeServiceCategory(value: string): VmbServiceCategory {
  if (value === "facial") return "skin";
  if (value === "other") return "nails";
  if ((VMB_SERVICE_CATEGORIES as readonly string[]).includes(value)) {
    return value as VmbServiceCategory;
  }
  return "nails";
}

export type VmbService = {
  id: string;
  salonId?: string;
  category: VmbServiceCategory;
  name: string;
  description?: string;
  basePriceCents?: number;
  durationMinutes?: number;
  active: boolean;
  displayOrder: number;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
};
