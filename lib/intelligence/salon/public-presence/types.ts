// lib/intelligence/salon/public-presence/types.ts

export type SalonPublicPresenceSource =
  | "ig_direct_url"
  | "link_in_bio"
  | "google_search"
  | "google_business"
  | "public_web"
  | "website_crawl"
  | "provider_guess"
  | "manual";

export type SalonPublicPresenceUrlType =
  | "booking_provider"
  | "business_website"
  | "google_business_profile"
  | "facebook"
  | "instagram"
  | "link_in_bio"
  | "directory"
  | "salon_suite"
  | "review_site"
  | "unknown";

export type SalonIdentityPacket = {
  prospectId?: string;
  instagramHandle?: string;
  displayName?: string;
  bio?: string;
  city?: string;
  state?: string;
  categoryHint?: string;
  extractedPersonName?: string;
  extractedBusinessName?: string;
  extractedKeywords: string[];
  searchQueries: string[];
};

export type SalonPublicPresenceResult = {
  id: string;
  prospectId?: string;
  source: SalonPublicPresenceSource;
  url: string;
  title?: string;
  snippet?: string;
  urlType: SalonPublicPresenceUrlType;
  provider?: string;
  providerLabel?: string;
  confidence: number;
  evidence: string[];
  discoveredAt: string;
};

export type SalonPublicPresenceBestProvider = {
  provider: string;
  providerLabel: string;
  bookingUrl: string;
  confidence: number;
  source: SalonPublicPresenceSource;
  evidence: string[];
  ggValidationStatus?:
    | "not_attempted"
    | "candidate_only"
    | "confirmed_client_page"
    | "generic_glossgenius_page"
    | "not_found"
    | "redirect_home"
    | "blocked"
    | "timeout"
    | "error";
  ggValidatedUrl?: string;
  ggCandidateUrls?: string[];
};

export type SalonPublicPresenceDiagnostics = {
  directUrlsScanned: number;
  linkTrailUrlsScanned: number;
  searchQueriesRun: number;
  searchResultsScanned: number;
  providerUrlsFound: number;
  websiteUrlsFound: number;
  ggFallbackAttempted: boolean;
  ggFallbackFound: boolean;
  searchProvider: "serpapi" | "google_custom_search" | "disabled";
  searchMessage?: string;
  errors: string[];
};

export type SalonPublicPresenceDiscoveryResult = {
  prospectId?: string;
  identity: SalonIdentityPacket;
  presenceResults: SalonPublicPresenceResult[];
  bestProvider?: SalonPublicPresenceBestProvider;
  diagnostics: SalonPublicPresenceDiagnostics;
};

export type PublicPresenceProspectInput = {
  prospectId?: string;
  instagramHandle?: string;
  displayName?: string | null;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  categoryHint?: string | null;
  website?: string | null;
  bioUrl?: string | null;
  bestMatchUrl?: string | null;
  allMatchedUrls?: Array<{ url: string } | string>;
  linkTrailUrls?: string[];
  linkTrailUrlsScanned?: string[];
  linkInBioUrl?: string | null;
  linkInBioPageFetched?: boolean;
  evidence?: Array<string | { label?: string; url?: string; type?: string }>;
  bookingProvider?: string;
  bookingProviderConfidence?: number;
  bookingProviderSource?: string;
  bookingUrl?: string;
};
