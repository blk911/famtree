// lib/intelligence/salon/business-stack/types.ts

export type SalonStackCategory =
  | "booking"
  | "payments"
  | "check_in"
  | "website_builder"
  | "ecommerce"
  | "reviews"
  | "marketing"
  | "social"
  | "analytics"
  | "crm"
  | "unknown";

export type SalonStackSignalSource =
  | "direct_url"
  | "link_in_bio"
  | "website_html"
  | "website_link"
  | "public_search"
  | "manual";

export type SalonStackProvider = {
  id: string;
  label: string;
  category: SalonStackCategory;
  domains: string[];
  urlPatterns?: string[];
  htmlMarkers?: string[];
  notes?: string;
};

export type SalonStackSignal = {
  providerId: string;
  providerLabel: string;
  category: SalonStackCategory;
  source: SalonStackSignalSource;
  url?: string;
  confidence: number;
  evidence: string[];
  detectedAt: string;
};

export type SalonOperationalMaturity = "low" | "medium" | "high";

export type SalonBusinessStack = {
  prospectId?: string;
  instagramHandle?: string;
  signals: SalonStackSignal[];
  primaryBookingProvider?: string;
  primaryPaymentProvider?: string;
  websiteBuilder?: string;
  reviewPresence?: string[];
  marketingPixels?: string[];
  checkInProvider?: string;
  stackCompletenessScore: number;
  operationalMaturity: SalonOperationalMaturity;
  importOpportunity: boolean;
  notes: string[];
  updatedAt: string;
};

export type StackDetectInput = {
  prospectId?: string;
  instagramHandle?: string;
  urls?: string[];
  html?: string;
  source?: SalonStackSignalSource;
};

export type WebsiteStackCrawlResult = {
  ok: boolean;
  finalUrl?: string;
  httpStatus?: number;
  title?: string;
  links: string[];
  signals: SalonStackSignal[];
  errors: string[];
};

export type StackProspectInput = {
  prospectId?: string;
  instagramHandle?: string;
  displayName?: string;
  website?: string | null;
  bioUrl?: string | null;
  bestMatchUrl?: string | null;
  bookingUrl?: string | null;
  linkInBioUrl?: string | null;
  linkTrailUrls?: string[];
  linkTrailUrlsScanned?: string[];
  allMatchedUrls?: Array<{ url: string } | string>;
  bookingProvider?: string;
  bookingProviderConfidence?: number;
  bookingProviderSource?: string;
  /** Pre-collected URL sets from prospect record (backfill). */
  collectedUrls?: string[];
  collectedDirectUrls?: string[];
  collectedLinkUrls?: string[];
};

export type StackBuildMeta = {
  urlsScanned: number;
  allUrls: string[];
  warnings: string[];
};

export type StackBackfillProspectResult = {
  prospectId: string;
  handle: string;
  urlsScanned: number;
  signalsFound: number;
  providersFound: string[];
  primaryBookingProvider?: string;
  primaryPaymentProvider?: string;
  checkInProvider?: string;
  websiteBuilder?: string;
  errors: string[];
  warnings: string[];
  skipped?: boolean;
  failed?: boolean;
};

export type StackBackfillSummary = {
  ok: true;
  checked: number;
  stacksCreated: number;
  stacksUpdated: number;
  providersFound: number;
  bookingProvidersFound: number;
  paymentProvidersFound: number;
  checkInProvidersFound: number;
  websiteBuildersFound: number;
  skippedNoUrls: number;
  failed: number;
  errors: string[];
  sample: Array<{
    handle: string;
    booking?: string;
    payment?: string;
    checkIn?: string;
    score?: number;
  }>;
  results: StackBackfillProspectResult[];
};
