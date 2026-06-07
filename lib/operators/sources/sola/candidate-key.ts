// lib/operators/sources/sola/candidate-key.ts

import {
  extractProfileSlug,
  normalizeSolaName,
  normalizeSolaProfileUrl,
} from "./profile-url-utils";
import type { SolaRawListing } from "./types";

export { extractProfileSlug } from "./profile-url-utils";

export function buildSuiteGroupKey(slug: string, suiteNumber?: string): string | undefined {
  const suite = suiteNumber?.trim();
  if (!suite) return undefined;
  return `sola:${slug.trim().toLowerCase()}:suite:${suite}`;
}

export function buildBusinessGroupKey(
  slug: string,
  businessName?: string,
): string | undefined {
  const normalized = normalizeSolaName(businessName ?? "");
  if (!normalized) return undefined;
  return `sola:${slug.trim().toLowerCase()}:business:${normalized}`;
}

export function buildSolaCandidateKey(
  slug: string,
  listing: Pick<
    SolaRawListing,
    | "profileUrl"
    | "normalizedProfileUrl"
    | "businessName"
    | "professionalName"
    | "displayName"
    | "suite"
    | "suiteLabel"
  >,
): string {
  const cleanSlug = slug.trim().toLowerCase();
  const profileUrl =
    listing.normalizedProfileUrl ?? normalizeSolaProfileUrl(listing.profileUrl);
  const profileSlug = extractProfileSlug(profileUrl);

  if (profileSlug) {
    return `sola:${cleanSlug}:profile:${profileSlug}`;
  }

  const business = normalizeSolaName(listing.businessName ?? "");
  const professional = normalizeSolaName(listing.professionalName ?? "");
  const suite = normalizeSolaName(listing.suite ?? listing.suiteLabel ?? "");

  if (business && professional && suite) {
    return `sola:${cleanSlug}:${business}:${professional}:${suite}`;
  }

  const operatorName = normalizeSolaName(
    listing.businessName || listing.professionalName || listing.displayName || "",
  );
  if (operatorName && suite) {
    return `sola:${cleanSlug}:${operatorName}:${suite}`;
  }

  return `sola:${cleanSlug}:${operatorName || "unknown"}`;
}
