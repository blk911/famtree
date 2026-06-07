// lib/operators/sources/sola/dedupe-listings.ts

import { normalizeSolaName, normalizeSolaProfileUrl } from "./scrape-sola-location";
import type { SolaRawListing } from "./types";

function listingCompleteness(listing: SolaRawListing): number {
  let score = 0;
  if (listing.profileUrl) score += 4;
  if (listing.imageUrl) score += 2;
  if (listing.categories.length) score += 2;
  if (listing.suite) score += 1;
  if (listing.professionalName) score += 1;
  if (listing.businessName) score += 1;
  return score;
}

function dedupeKey(listing: SolaRawListing): string {
  const profileUrl =
    listing.normalizedProfileUrl ?? normalizeSolaProfileUrl(listing.profileUrl);
  if (profileUrl) {
    return `url:${profileUrl}`;
  }

  const business = normalizeSolaName(listing.businessName ?? "");
  const professional = normalizeSolaName(listing.professionalName ?? "");
  const suite = normalizeSolaName(listing.suite ?? listing.suiteLabel ?? "");

  if (business && professional && suite) {
    return `biz-pro-suite:${business}|${professional}|${suite}`;
  }

  return `fallback:${listing.candidateKey}`;
}

/**
 * Collapse duplicate directory cards within one Sola location slug.
 * Only merges when profileUrl matches, or business + professional + suite all match.
 */
export function dedupeSolaListings(listings: SolaRawListing[]): SolaRawListing[] {
  const bestByKey = new Map<string, SolaRawListing>();

  for (const listing of listings) {
    const key = dedupeKey(listing);
    const existing = bestByKey.get(key);
    if (!existing || listingCompleteness(listing) > listingCompleteness(existing)) {
      bestByKey.set(key, listing);
    }
  }

  return Array.from(bestByKey.values());
}
