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
};
