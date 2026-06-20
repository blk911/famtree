import type { ServicePhotoAsset, ServicePhotoCategory } from "./service-image-types";

/** Tags that must appear on at least one tag in the asset (any-of). */
export const CATEGORY_REQUIRED_TAG_ANY: Partial<Record<ServicePhotoCategory, readonly string[]>> = {
  pedicure: ["pedicure", "feet"],
  gel_x: ["gel-x", "extensions", "long", "full-set"],
  acrylic: ["acrylic", "extensions"],
  fill_refresh: ["fill", "refill", "maintenance", "refresh"],
  builder_gel: ["builder", "overlay", "strengthening", "application"],
  structured_gel: ["structured", "overlay", "sculpted", "architecture"],
  gel_manicure: ["gel", "manicure", "polish"],
};

/** Tags that must never appear outside their home category. */
export const CATEGORY_EXCLUSIVE_TAGS: Record<string, ServicePhotoCategory> = {
  pedicure: "pedicure",
  feet: "pedicure",
  "gel-x": "gel_x",
  acrylic: "acrylic",
};

/** Pexels IDs reserved for a single category (prevents cross-category reuse). */
export const PEXELS_ID_CATEGORY_LOCK: Record<number, ServicePhotoCategory> = {
  3997991: "pedicure",
};

/** Unsplash photo ids reserved for extension categories only. */
export const UNSPLASH_EXTENSION_IDS = new Set(["1777287852750-53eb2ca506e9"]);

const EXTENSION_CATEGORIES = new Set<ServicePhotoCategory>(["gel_x", "acrylic"]);

const SHORT_MANICURE_PEXELS = new Set([3997985]);
const SHORT_MANICURE_UNSPLASH = new Set([
  "1604654894610-df63bc536371",
  "1632345031435-8727f6897d53",
]);

function normalizeTags(tags: readonly string[]): string[] {
  return tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean);
}

function tagSet(tags: readonly string[]): Set<string> {
  return new Set(normalizeTags(tags));
}

function extractPexelsId(imageUrl: string): number | undefined {
  const match = /\/photos\/(\d+)\//.exec(imageUrl);
  return match ? Number(match[1]) : undefined;
}

function extractUnsplashId(imageUrl: string): string | undefined {
  const match = /photo-([0-9]+-[0-9a-f]+)/i.exec(imageUrl);
  return match?.[1];
}

export type CategoryGuardrailViolation = {
  assetId: string;
  category: ServicePhotoCategory;
  rule: string;
  detail: string;
};

export function validateServicePhotoAsset(asset: ServicePhotoAsset): CategoryGuardrailViolation[] {
  const violations: CategoryGuardrailViolation[] = [];
  const tags = tagSet(asset.tags);
  const pexelsId = extractPexelsId(asset.imageUrl);
  const unsplashId = extractUnsplashId(asset.imageUrl);

  const requiredAny = CATEGORY_REQUIRED_TAG_ANY[asset.category];
  if (requiredAny && !requiredAny.some((required) => tags.has(required))) {
    violations.push({
      assetId: asset.id,
      category: asset.category,
      rule: "required-tag",
      detail: `missing one of: ${requiredAny.join(", ")}`,
    });
  }

  for (const [exclusiveTag, ownerCategory] of Object.entries(CATEGORY_EXCLUSIVE_TAGS)) {
    if (tags.has(exclusiveTag) && asset.category !== ownerCategory) {
      violations.push({
        assetId: asset.id,
        category: asset.category,
        rule: "exclusive-tag",
        detail: `tag "${exclusiveTag}" belongs to ${ownerCategory}`,
      });
    }
  }

  if (pexelsId !== undefined) {
    const lockedCategory = PEXELS_ID_CATEGORY_LOCK[pexelsId];
    if (lockedCategory && lockedCategory !== asset.category) {
      violations.push({
        assetId: asset.id,
        category: asset.category,
        rule: "pexels-lock",
        detail: `pexels:${pexelsId} is locked to ${lockedCategory}`,
      });
    }
    if (asset.category !== "pedicure" && pexelsId === 3997991) {
      violations.push({
        assetId: asset.id,
        category: asset.category,
        rule: "pedicure-image",
        detail: "pedicure-only pexels id used outside pedicure",
      });
    }
    if (EXTENSION_CATEGORIES.has(asset.category) && SHORT_MANICURE_PEXELS.has(pexelsId)) {
      violations.push({
        assetId: asset.id,
        category: asset.category,
        rule: "short-manicure-image",
        detail: "short manicure image used in extension category",
      });
    }
  }

  if (unsplashId !== undefined) {
    if (
      UNSPLASH_EXTENSION_IDS.has(unsplashId) &&
      !EXTENSION_CATEGORIES.has(asset.category)
    ) {
      violations.push({
        assetId: asset.id,
        category: asset.category,
        rule: "extension-image",
        detail: "long extension image used outside gel_x/acrylic",
      });
    }
    if (EXTENSION_CATEGORIES.has(asset.category) && SHORT_MANICURE_UNSPLASH.has(unsplashId)) {
      violations.push({
        assetId: asset.id,
        category: asset.category,
        rule: "short-manicure-image",
        detail: "short manicure image used in extension category",
      });
    }
  }

  if (
    asset.category === "pedicure" &&
    !(pexelsId === 3997991 || (asset.shotType === "feet" && (tags.has("pedicure") || tags.has("feet"))))
  ) {
    violations.push({
      assetId: asset.id,
      category: asset.category,
      rule: "pedicure-source",
      detail: "pedicure category must use verified feet/pedicure imagery",
    });
  }

  if (
    (asset.category === "gel_x" || asset.category === "acrylic") &&
    !(unsplashId === "1777287852750-53eb2ca506e9" || (asset.nailLength === "long" && tags.has("extensions")))
  ) {
    violations.push({
      assetId: asset.id,
      category: asset.category,
      rule: "extension-source",
      detail: "extension categories must use long extension imagery",
    });
  }

  if (tags.has("pedicure") || tags.has("feet")) {
    if (asset.category !== "pedicure") {
      violations.push({
        assetId: asset.id,
        category: asset.category,
        rule: "pedicure-tag",
        detail: "pedicure/feet tags only allowed in pedicure category",
      });
    }
  }

  if (tags.has("spa") && asset.category === "fill_refresh" && !tags.has("refresh")) {
    violations.push({
      assetId: asset.id,
      category: asset.category,
      rule: "spa-tag",
      detail: "fill_refresh must not use generic spa tags without refresh context",
    });
  }

  return violations;
}

export function validateServicePhotoLibrary(
  assets: readonly ServicePhotoAsset[],
): CategoryGuardrailViolation[] {
  return assets
    .filter((asset) => asset.active)
    .flatMap((asset) => validateServicePhotoAsset(asset));
}
