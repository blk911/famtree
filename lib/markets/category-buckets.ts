// lib/markets/category-buckets.ts

import type { MarketCategoryBucket } from "./types";

export const CATEGORY_BUCKET_ORDER: MarketCategoryBucket[] = [
  "barber",
  "nails",
  "lashes",
  "skin",
  "wax",
  "massage",
  "hair",
  "other",
];

const BUCKET_PATTERNS: Array<{ bucket: MarketCategoryBucket; pattern: RegExp }> = [
  { bucket: "barber", pattern: /\bbarber\b/i },
  { bucket: "nails", pattern: /\bnail/i },
  { bucket: "lashes", pattern: /\b(lash|brow)\b/i },
  { bucket: "skin", pattern: /\b(skin|facial|electrolysis)\b/i },
  { bucket: "wax", pattern: /\bwax/i },
  { bucket: "massage", pattern: /\b(massage|bodywork)\b/i },
  { bucket: "hair", pattern: /\b(hair|braid|colorist|stylist|curl)\b/i },
];

const ALLOWED_BUCKETS = new Set<MarketCategoryBucket>(CATEGORY_BUCKET_ORDER);

export function clampMarketScore(value: number, max = 100): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

export function filterValidCategoryBuckets(buckets: string[]): MarketCategoryBucket[] {
  return buckets.filter((b): b is MarketCategoryBucket => ALLOWED_BUCKETS.has(b as MarketCategoryBucket));
}

export function resolveCategoryBucketsFromText(...texts: Array<string | null | undefined>): MarketCategoryBucket[] {
  const haystack = texts
    .filter((t): t is string => Boolean(t?.trim()))
    .join(" ")
    .trim();

  const buckets = new Set<MarketCategoryBucket>();
  for (const { bucket, pattern } of BUCKET_PATTERNS) {
    if (pattern.test(haystack)) buckets.add(bucket);
  }

  if (buckets.size === 0) buckets.add("other");
  return CATEGORY_BUCKET_ORDER.filter((bucket) => buckets.has(bucket));
}

export function categoryAcquisitionWeight(buckets: MarketCategoryBucket[]): number {
  let weight = 0;
  for (const bucket of buckets) {
    if (bucket === "nails" || bucket === "lashes" || bucket === "skin" || bucket === "wax") {
      weight = Math.max(weight, 15);
    } else if (bucket === "massage") {
      weight = Math.max(weight, 12);
    } else if (bucket === "hair" || bucket === "barber") {
      weight = Math.max(weight, 8);
    } else if (bucket === "other") {
      weight = Math.max(weight, 3);
    }
  }
  return weight;
}

export function computeAcquisitionScore(
  contactabilityScore: number,
  categoryBuckets: MarketCategoryBucket[],
): number {
  return clampMarketScore(contactabilityScore + categoryAcquisitionWeight(categoryBuckets));
}
