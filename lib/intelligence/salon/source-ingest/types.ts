// lib/intelligence/salon/source-ingest/types.ts

export type SalonDirectoryProvider =
  | "vagaro"
  | "styleseat"
  | "glossgenius"
  | "sola"
  | "phenix"
  | "spectra"
  | "unknown";

export type DirectorySourceType =
  | "vagaro_directory"
  | "styleseat_directory"
  | "glossgenius_directory"
  | "suite_directory"
  | "unknown_directory";

export type DirectoryKind = "directory";

export interface DirectoryClassification {
  kind: DirectoryKind;
  provider: SalonDirectoryProvider;
  providerLabel: string;
  sourceType: DirectorySourceType;
  directoryUrl: string;
  market?: string;
  category?: string;
  warnings: string[];
}

export interface DirectoryRawListing {
  displayName: string;
  professionalName?: string;
  businessName?: string;
  providerProfileUrl?: string;
  bookingUrl?: string;
  city?: string;
  state?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  sourceUrl: string;
  sourceProvider: SalonDirectoryProvider;
  sourceType: DirectorySourceType;
  evidence: string[];
}

export interface DirectoryCandidate extends DirectoryRawListing {
  dedupeKey: string;
}

export type DirectoryScrollMode = "static" | "full_scroll";

export interface DirectoryIngestRequest {
  url: string;
  market?: string;
  category?: string;
  notes?: string;
  /** Vagaro: scroll page in headless browser to load lazy directory cards */
  fullScroll?: boolean;
}

export interface DirectoryIngestResult {
  ok: boolean;
  sourceType: DirectorySourceType;
  provider: SalonDirectoryProvider;
  providerLabel: string;
  directoryUrl: string;
  market?: string;
  category?: string;
  notes?: string;
  candidatesFound: number;
  candidatesCreated: number;
  staticCandidatesFound?: number;
  browserCandidatesFound?: number;
  scrollModeUsed?: DirectoryScrollMode;
  scrollAttempts?: number;
  browserAvailable?: boolean;
  duplicates: number;
  warnings: string[];
  errors: string[];
  ingestRunId?: string;
}
