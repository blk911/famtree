export type VmbServiceCategory =
  | "nails"
  | "hair"
  | "brows"
  | "lashes"
  | "waxing"
  | "facial"
  | "massage"
  | "other";

export const VMB_SERVICE_CATEGORIES: readonly VmbServiceCategory[] = [
  "nails",
  "hair",
  "brows",
  "lashes",
  "waxing",
  "facial",
  "massage",
  "other",
] as const;

export type VmbService = {
  id: string;
  salonId?: string;
  category: VmbServiceCategory;
  name: string;
  description?: string;
  active: boolean;
  displayOrder: number;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
};
