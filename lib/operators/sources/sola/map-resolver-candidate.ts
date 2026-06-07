// lib/operators/sources/sola/map-resolver-candidate.ts

import {
  buildBusinessGroupKey,
  buildSolaCandidateKey,
  buildSuiteGroupKey,
} from "./candidate-key";
import { normalizeSolaName, normalizeSolaProfileUrl } from "./scrape-sola-location";
import type { SolaRawListing, SolaResolverCandidate } from "./types";
import { SOLA_PARENT_CONTAINER_BRAND, SOLA_SOURCE_PROVIDER, SOLA_SOURCE_TYPE } from "./types";

function resolveOperatorIdentity(listing: SolaRawListing): {
  operatorName: string;
  displayName: string;
  brandOrStudioName?: string;
  contactName?: string;
} {
  const business = listing.businessName?.trim();
  const professional = listing.professionalName?.trim();

  if (
    business &&
    professional &&
    normalizeSolaName(business) !== normalizeSolaName(professional)
  ) {
    return {
      operatorName: professional,
      displayName: `${professional} · ${business}`,
      brandOrStudioName: business,
      contactName: professional,
    };
  }

  const operatorName = business || professional || listing.displayName;
  return {
    operatorName,
    displayName: operatorName,
    brandOrStudioName: business,
    contactName: professional && professional !== operatorName ? professional : undefined,
  };
}

export function mapListingToResolverCandidate(
  listing: SolaRawListing,
  slug: string,
): SolaResolverCandidate {
  const identity = resolveOperatorIdentity(listing);
  const suiteNumber = listing.suite ?? listing.suiteLabel;
  const profileUrl = listing.normalizedProfileUrl ?? normalizeSolaProfileUrl(listing.profileUrl);

  return {
    candidateKey: buildSolaCandidateKey(slug, listing),
    operatorName: identity.operatorName,
    displayName: identity.displayName,
    brandOrStudioName: identity.brandOrStudioName,
    contactName: identity.contactName,
    locationName: listing.parentContainerName,
    suiteNumber,
    suiteGroupKey: buildSuiteGroupKey(slug, listing.suite ?? listing.suiteLabel),
    businessGroupKey: buildBusinessGroupKey(slug, listing.businessName),
    categories: listing.categories,
    services: listing.services.length ? listing.services : listing.categories,
    profileUrl,
    website: profileUrl,
    imageUrl: listing.imageUrl,
    sourceProvider: SOLA_SOURCE_PROVIDER,
    sourceType: SOLA_SOURCE_TYPE,
    sourceUrl: listing.sourceUrl,
    parentContainerId: listing.parentContainerId,
    parentContainerSlug: slug,
    parentContainerName: listing.parentContainerName,
    locationSlug: listing.locationSlug,
    professionalName: listing.professionalName,
    businessName: listing.businessName,
    isChildOperator: true,
    parentContainerType: "salon_suite",
    parentContainerBrand: SOLA_PARENT_CONTAINER_BRAND,
    containerRelationship: "tenant",
    phoneLinks: listing.phoneLinks,
    socialLinks: listing.socialLinks,
    bookingLinks: listing.bookingLinks,
    sharedSuite: false,
    sharedBusiness: false,
  };
}

export function applyGroupingMetadata(
  candidates: SolaResolverCandidate[],
): SolaResolverCandidate[] {
  const suiteCounts = new Map<string, number>();
  const businessCounts = new Map<string, number>();

  for (const candidate of candidates) {
    if (candidate.suiteGroupKey) {
      suiteCounts.set(
        candidate.suiteGroupKey,
        (suiteCounts.get(candidate.suiteGroupKey) ?? 0) + 1,
      );
    }
    if (candidate.businessGroupKey) {
      businessCounts.set(
        candidate.businessGroupKey,
        (businessCounts.get(candidate.businessGroupKey) ?? 0) + 1,
      );
    }
  }

  return candidates.map((candidate) => ({
    ...candidate,
    sharedSuite: candidate.suiteGroupKey
      ? (suiteCounts.get(candidate.suiteGroupKey) ?? 0) > 1
      : false,
    sharedBusiness: candidate.businessGroupKey
      ? (businessCounts.get(candidate.businessGroupKey) ?? 0) > 1
      : false,
  }));
}
