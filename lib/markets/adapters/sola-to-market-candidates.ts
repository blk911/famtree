// lib/markets/adapters/sola-to-market-candidates.ts

import path from "path";
import { readSolaResolverImport } from "@/lib/operators/sources/sola/read-sola-resolver-import";
import { RESOLVER_IMPORT_ARTIFACT_PATH } from "@/lib/operators/sources/sola/build-resolver-import";
import { readSolaReviewStates } from "@/lib/operators/sources/sola/sola-review-state-store";
import type { SolaResolverImportRecord } from "@/lib/operators/sources/sola/types";
import { filterValidCategoryBuckets } from "@/lib/markets/category-buckets";
import {
  normalizeBookingKey,
  normalizeOperatorName,
  normalizePhoneKeys,
  normalizeSocialHandles,
  normalizeWebsiteDomain,
} from "@/lib/markets/normalize-identity";
import type { MarketCandidate } from "@/lib/markets/types";

export const SOLA_SOURCE_KEY = "sola";

export interface SolaAdapterResult {
  sourceKey: typeof SOLA_SOURCE_KEY;
  artifactPath: string;
  lastImportedAt: string;
  candidates: MarketCandidate[];
  importedCount: number;
  skippedCount: number;
}

function mapSolaRecord(
  record: SolaResolverImportRecord,
  importGeneratedAt: string,
  reviewStatus: MarketCandidate["reviewStatus"],
  notes: string,
  reviewedAt?: string,
): MarketCandidate {
  return {
    candidateKey: record.candidateKey,
    sourceProvider: record.sourceProvider,
    sourceType: record.sourceType,
    operatorName: record.operatorName,
    displayName: record.displayName,
    professionalName: record.professionalName,
    businessName: record.businessName ?? record.brandOrStudioName,
    locationName: record.locationName,
    locationSlug: record.locationSlug,
    city: record.locationName,
    state: "CO",
    suiteNumber: record.suiteNumber,
    categories: record.categories,
    categoryBuckets: filterValidCategoryBuckets(record.categoryBuckets),
    phones: record.phones,
    emails: record.emails,
    bookingLinks: record.bookingLinks,
    website: record.website,
    externalLinks: record.externalLinks,
    socialLinks: record.socialLinks,
    profileUrl: record.profileUrl,
    imageUrl: record.imageUrl,
    bio: record.bio,
    parentContainerId: record.parentContainerId,
    parentContainerBrand: record.parentContainerBrand,
    parentContainerType: record.parentContainerType,
    containerRelationship: record.containerRelationship,
    verificationStatus: record.verificationStatus,
    contactabilityScore: record.contactabilityScore,
    identityScore: record.identityScore,
    acquisitionScore: record.acquisitionScore,
    recommendedAction: record.recommendedAction,
    reviewStatus,
    notes,
    createdAt: importGeneratedAt,
    updatedAt: reviewedAt ?? importGeneratedAt,
    normalizedOperatorName: normalizeOperatorName(record.displayName || record.operatorName),
    normalizedPhoneKeys: normalizePhoneKeys(record.phones),
    normalizedWebsiteDomain: record.website ? normalizeWebsiteDomain(record.website) : undefined,
    normalizedSocialHandles: normalizeSocialHandles(record.socialLinks),
    normalizedBookingKey: normalizeBookingKey(
      record.bookingLinks[0] ?? record.profileUrl ?? "",
    ),
  };
}

export async function adaptSolaToMarketCandidates(): Promise<SolaAdapterResult | null> {
  const importArtifact = await readSolaResolverImport();
  if (!importArtifact) return null;

  const reviewStates = await readSolaReviewStates();

  const candidates = importArtifact.records.map((record) => {
    const review = reviewStates[record.candidateKey];
    const reviewStatus = review?.reviewStatus ?? "unreviewed";
    return mapSolaRecord(
      record,
      importArtifact.generatedAt,
      reviewStatus,
      review?.notes ?? "",
      review?.reviewedAt,
    );
  });

  return {
    sourceKey: SOLA_SOURCE_KEY,
    artifactPath: path.relative(process.cwd(), RESOLVER_IMPORT_ARTIFACT_PATH),
    lastImportedAt: importArtifact.generatedAt,
    candidates,
    importedCount: candidates.length,
    skippedCount: 0,
  };
}
