// lib/operators/sources/sola/map-resolver-candidate.ts

import {
  buildCandidateKey,
  normalizeSolaName,
  normalizeSolaProfileUrl,
} from "./scrape-sola-location";
import type { SolaRawListing, SolaResolverCandidate } from "./types";
import { SOLA_PARENT_CONTAINER_BRAND, SOLA_SOURCE_PROVIDER, SOLA_SOURCE_TYPE } from "./types";

function operatorNameFor(listing: SolaRawListing): string {
  return listing.businessName || listing.professionalName || listing.displayName;
}

export function mapListingToResolverCandidate(
  listing: SolaRawListing,
  slug: string,
): SolaResolverCandidate {
  const operatorName = operatorNameFor(listing);
  const normalizedOperator = normalizeSolaName(operatorName);
  const suiteNumber = listing.suite ?? listing.suiteLabel;
  const profileUrl = listing.normalizedProfileUrl ?? normalizeSolaProfileUrl(listing.profileUrl);
  const contactName =
    listing.professionalName &&
    normalizeSolaName(listing.professionalName) !== normalizedOperator
      ? listing.professionalName
      : undefined;

  return {
    candidateKey: buildCandidateKey(slug, operatorName, suiteNumber),
    operatorName,
    contactName,
    locationName: listing.parentContainerName,
    suiteNumber,
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
  };
}
