// lib/operators/sources/sola/types.ts

export const SOLA_SOURCE_PROVIDER = "sola" as const;
export const SOLA_SOURCE_TYPE = "suite_directory" as const;

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
  categories: string[];
  phoneLinks: string[];
  socialLinks: string[];
  bookingLinks: string[];
  normalizedName: string;
  normalizedCity?: string;
  normalizedProfileUrl?: string;
  parentContainerId: string;
  candidateKey: string;
}

export interface SolaLocationScrapeResult {
  sourceProvider: typeof SOLA_SOURCE_PROVIDER;
  sourceType: typeof SOLA_SOURCE_TYPE;
  parentContainerSlug: string;
  sourceUrl: string;
  fetchedAt: string;
  apiHits: SolaApiHit[];
  listings: SolaRawListing[];
  error?: string;
}

export interface SolaOperatorCandidate {
  candidateKey: string;
  parentContainerId: string;
  parentContainerSlug: string;
  sourceProvider: typeof SOLA_SOURCE_PROVIDER;
  sourceType: typeof SOLA_SOURCE_TYPE;
  displayName: string;
  professionalName?: string;
  businessName?: string;
  normalizedName: string;
  normalizedCity?: string;
  normalizedProfileUrl?: string;
  profileUrl?: string;
  bookingUrl?: string;
  imageUrl?: string;
  suiteLabel?: string;
  categories: string[];
  visibleText: string;
  phoneLinks: string[];
  socialLinks: string[];
  bookingLinks: string[];
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
  listingsFound: number;
  candidates: SolaOperatorCandidate[];
  evidence: SolaEvidenceRecord[];
  scrape?: SolaLocationScrapeResult;
  error?: string;
}

export interface SolaHarvestArtifact {
  harvestedAt: string;
  slugs: string[];
  results: SolaSlugHarvestResult[];
  errors: Array<{ slug: string; error: string }>;
}
