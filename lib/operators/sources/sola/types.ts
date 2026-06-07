// lib/operators/sources/sola/types.ts

export const SOLA_SOURCE_PROVIDER = "sola" as const;
export const SOLA_SOURCE_TYPE = "suite_directory" as const;
export const SOLA_PARENT_CONTAINER_BRAND = "Sola Salon Studios" as const;

export interface SolaApiHit {
  url: string;
  status: number;
  contentType: string;
  body: unknown;
}

export interface SolaRawListing {
  professionalName?: string;
  businessName?: string;
  displayName: string;
  visibleText: string;
  profileUrl?: string;
  imageUrl?: string;
  suiteLabel?: string;
  suite?: string;
  categories: string[];
  services: string[];
  phoneLinks: string[];
  socialLinks: string[];
  bookingLinks: string[];
  locationSlug: string;
  parentContainerId: string;
  parentContainerName?: string;
  sourceUrl: string;
  normalizedName: string;
  normalizedCity?: string;
  normalizedProfileUrl?: string;
  candidateKey: string;
}

export interface SolaLocationScrapeResult {
  sourceProvider: typeof SOLA_SOURCE_PROVIDER;
  sourceType: typeof SOLA_SOURCE_TYPE;
  parentContainerSlug: string;
  parentContainerName?: string;
  sourceUrl: string;
  fetchedAt: string;
  apiHits: SolaApiHit[];
  listings: SolaRawListing[];
  error?: string;
}

export interface SolaResolverCandidate {
  candidateKey: string;
  operatorName: string;
  displayName: string;
  brandOrStudioName?: string;
  contactName?: string;
  locationName?: string;
  suiteNumber?: string;
  suiteGroupKey?: string;
  businessGroupKey?: string;
  sharedSuite: boolean;
  sharedBusiness: boolean;
  categories: string[];
  services: string[];
  profileUrl?: string;
  website?: string;
  imageUrl?: string;
  sourceProvider: typeof SOLA_SOURCE_PROVIDER;
  sourceType: typeof SOLA_SOURCE_TYPE;
  sourceUrl: string;
  parentContainerId: string;
  parentContainerSlug: string;
  parentContainerName?: string;
  locationSlug: string;
  professionalName?: string;
  businessName?: string;
  isChildOperator: true;
  parentContainerType: "salon_suite";
  parentContainerBrand: typeof SOLA_PARENT_CONTAINER_BRAND;
  containerRelationship: "tenant";
  phoneLinks: string[];
  socialLinks: string[];
  bookingLinks: string[];
  phones?: string[];
  emails?: string[];
  externalLinks?: string[];
  bio?: string;
  profileImages?: string[];
  enrichmentStatus?: SolaEnrichmentStatus;
  enrichmentMethod?: SolaEnrichmentMethod;
  enrichmentFetchedAt?: string;
}

export interface SolaProfileApiHit {
  url: string;
  status: number;
  contentType: string;
  body: unknown;
}

export type SolaEnrichmentMethod = "api" | "playwright" | "mixed" | "failed";

export type SolaEnrichmentStatus =
  | "enriched"
  | "failed"
  | "skipped"
  | "skipped_api_unavailable";

export interface SolaProfileEnrichment {
  profileUrl: string;
  pageTitle?: string;
  professionalName?: string;
  businessName?: string;
  phoneLinks: string[];
  emailLinks: string[];
  websiteLinks: string[];
  instagramLinks: string[];
  facebookLinks: string[];
  bookingLinks: string[];
  services: string[];
  bio?: string;
  imageUrls: string[];
  visibleTextSample?: string;
  fetchedAt: string;
  apiHitsCount: number;
  likelyProfileApiEndpoint?: string;
  enrichmentMethod?: SolaEnrichmentMethod;
  apiStatus?: "ok" | "failed" | "not_available";
  apiEndpoint?: string;
  apiFetchedAt?: string;
  error?: string;
}

export interface SolaProfileEnrichmentArtifact {
  generatedAt: string;
  sourceProvider: typeof SOLA_SOURCE_PROVIDER;
  profileCount: number;
  profiles: SolaProfileEnrichment[];
}

export interface SolaHarvestOptions {
  enrichProfiles?: boolean;
  profileLimit?: number;
  apiOnly?: boolean;
}

export interface SolaEnrichmentTimingSummary {
  profilesAttempted: number;
  apiEnriched: number;
  playwrightEnriched: number;
  mixedEnriched: number;
  failed: number;
  skipped: number;
  durationMs: number;
}

/** @deprecated Use SolaResolverCandidate — kept for harvest artifact compatibility */
export interface SolaOperatorCandidate extends SolaResolverCandidate {
  displayName: string;
  normalizedName: string;
  normalizedCity?: string;
  normalizedProfileUrl?: string;
  bookingUrl?: string;
  suiteLabel?: string;
  visibleText: string;
}

export interface SolaEvidenceRecord {
  candidateKey: string;
  sourceProvider: typeof SOLA_SOURCE_PROVIDER;
  sourceType: typeof SOLA_SOURCE_TYPE;
  sourceUrl: string;
  evidenceUrl?: string;
  profileUrl?: string;
  parentContainerId: string;
  parentContainerSlug: string;
  confidence: number;
  capturedAt: string;
  notes?: string;
}

export interface SolaSlugHarvestResult {
  slug: string;
  ok: boolean;
  rawListings: number;
  dedupedListings: number;
  candidatesCreated: number;
  listingsFound: number;
  candidates: SolaResolverCandidate[];
  evidence: SolaEvidenceRecord[];
  scrape?: SolaLocationScrapeResult;
  profilesEnriched?: number;
  profileEnrichmentFailed?: number;
  profileEnrichments?: SolaProfileEnrichment[];
  error?: string;
}

export interface SolaHarvestArtifact {
  harvestedAt: string;
  slugs: string[];
  results: SolaSlugHarvestResult[];
  errors: Array<{ slug: string; error: string }>;
}

export interface SolaOperatorCandidatesArtifact {
  generatedAt: string;
  sourceProvider: typeof SOLA_SOURCE_PROVIDER;
  sourceType: typeof SOLA_SOURCE_TYPE;
  candidateCount: number;
  candidates: SolaResolverCandidate[];
}
