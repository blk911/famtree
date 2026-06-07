// lib/operators/sources/sola/dedupe-listings.ts

import { normalizeSolaName } from "./scrape-sola-location";
import type { SolaRawListing } from "./types";

function operatorNameFor(listing: SolaRawListing): string {
  return listing.businessName || listing.professionalName || listing.displayName;
}

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

function dedupeKey(listing: SolaRawListing): string | null {
  if (listing.normalizedProfileUrl) {
    return `url:${listing.normalizedProfileUrl}`;
  }

  const operator = normalizeSolaName(operatorNameFor(listing));
  const suite = normalizeSolaName(listing.suite ?? listing.suiteLabel ?? "");
  if (operator && suite) {
    return `op-suite:${operator}|${suite}`;
  }

  const pro = normalizeSolaName(listing.professionalName ?? "");
  const biz = normalizeSolaName(listing.businessName ?? "");
  if (pro || biz) {
    return `pro-biz:${pro}|${biz}`;
  }

  return null;
}

/**
 * Collapse duplicate directory cards within one Sola location slug.
 * Priority: profileUrl → operatorName+suite → professionalName+businessName.
 */
export function dedupeSolaListings(listings: SolaRawListing[]): SolaRawListing[] {
  const bestByKey = new Map<string, SolaRawListing>();

  for (const listing of listings) {
    const key = dedupeKey(listing) ?? `fallback:${listing.candidateKey}`;

    const existing = bestByKey.get(key);
    if (!existing || listingCompleteness(listing) > listingCompleteness(existing)) {
      bestByKey.set(key, listing);
    }
  }

  return Array.from(bestByKey.values());
}
