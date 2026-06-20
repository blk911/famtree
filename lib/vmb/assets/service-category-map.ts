import type { ServicePhotoCategory } from "./service-image-types";

export const serviceCategoryMap: Record<string, ServicePhotoCategory> = {
  "gel manicure": "gel_manicure",
  "builder gel": "builder_gel",
  "structured gel": "structured_gel",
  "gel-x extensions": "gel_x",
  "gel x extensions": "gel_x",
  "gel-x": "gel_x",
  "acrylic extensions": "acrylic",
  acrylic: "acrylic",
  "smart pedicure": "pedicure",
  pedicure: "pedicure",
  "fill & refresh": "fill_refresh",
  "fill and refresh": "fill_refresh",
  fill: "fill_refresh",
  refresh: "fill_refresh",
  "nail art": "nail_art",
  wax: "waxing",
  waxing: "waxing",
  lash: "lashes",
  lashes: "lashes",
  brow: "brows",
  brows: "brows",
};

export function normalizeServiceName(value?: string | null): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function resolveServicePhotoCategory(serviceName?: string | null): ServicePhotoCategory {
  const normalized = normalizeServiceName(serviceName);
  if (!normalized) return "generic_salon";
  if (serviceCategoryMap[normalized]) return serviceCategoryMap[normalized];
  if (normalized.includes("gel-x") || normalized.includes("gel x")) return "gel_x";
  if (normalized.includes("builder")) return "builder_gel";
  if (normalized.includes("structured")) return "structured_gel";
  if (normalized.includes("gel")) return "gel_manicure";
  if (normalized.includes("acrylic")) return "acrylic";
  if (normalized.includes("pedi")) return "pedicure";
  if (normalized.includes("fill") || normalized.includes("refresh")) return "fill_refresh";
  if (normalized.includes("art") || normalized.includes("design")) return "nail_art";
  if (normalized.includes("wax")) return "waxing";
  if (normalized.includes("lash")) return "lashes";
  if (normalized.includes("brow")) return "brows";
  return "generic_salon";
}
