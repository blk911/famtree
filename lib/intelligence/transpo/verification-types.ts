// lib/intelligence/transpo/verification-types.ts
// Contracts for the Transpo carrier verification layer: validating a carrier's
// public presence (Google Business, state registry, BBB, Facebook, website,
// address classification) before market outreach. External providers may be
// placeholder-mode until credentials are connected, but these shapes are stable.

export type TranspoVerificationProvider =
  | "google_business"
  | "state_registry"
  | "bbb"
  | "facebook"
  | "website"
  | "address_classifier";

export type TranspoVerificationStatus =
  | "verified"
  | "not_found"
  | "partial"
  | "placeholder"
  | "error";

export type TranspoAddressType =
  | "industrial_yard"
  | "warehouse"
  | "office"
  | "residential"
  | "po_box"
  | "unknown";

export type TranspoWebsiteSignal =
  | "homepage_found"
  | "contact_page_found"
  | "careers_page_found"
  | "hiring_language"
  | "owner_operator_language"
  | "quote_request"
  | "service_area"
  | "equipment_language"
  | "safety_language"
  | "broken_site"
  | "parked_domain"
  | "unknown";

export type TranspoWebsiteFetchStatus =
  | "not_attempted"
  | "fetched"
  | "partial"
  | "failed"
  | "blocked";

export type TranspoCarrierVerification = {
  id: string;
  carrierId: string;
  carrierKey: string;
  dotNumber?: string;
  companyName: string;
  city?: string;
  state?: string;

  // Google Business
  googleFound?: boolean;
  googleRating?: number;
  googleReviewCount?: number;
  googleWebsite?: string;
  googlePhone?: string;
  googlePlaceId?: string;
  googleMapsUrl?: string;
  googleAddress?: string;
  googleBusinessName?: string;
  googleCategory?: string;
  googleMatchConfidence?: number;
  googleMatchedBy?: "name_city_state" | "name_address" | "phone" | "unknown";

  // BBB
  bbbFound?: boolean;
  bbbRating?: string;
  bbbComplaintCount?: number;

  // Facebook
  facebookFound?: boolean;
  facebookUrl?: string;

  // State business registry
  stateEntityFound?: boolean;
  entityStatus?: string;
  formationDate?: string;

  // Website
  websiteFound?: boolean;
  websiteUrl?: string;

  // Website crawl enrichment
  websiteFetchStatus?: TranspoWebsiteFetchStatus;
  websiteHttpStatus?: number;
  websiteFinalUrl?: string;
  websiteTitle?: string;
  websiteDescription?: string;
  websiteSignals?: TranspoWebsiteSignal[];
  websitePagesChecked?: string[];
  websiteExtractedPhones?: string[];
  websiteExtractedEmails?: string[];
  websiteHiringFound?: boolean;
  websiteOwnerOperatorFound?: boolean;
  websiteQuoteRequestFound?: boolean;
  websiteLastFetchedAt?: string;

  // Address classification
  addressType?: TranspoAddressType;

  verificationScore: number;
  verificationStatus: TranspoVerificationStatus;
  notes: string[];
  providersChecked: TranspoVerificationProvider[];
  createdAt: string;
  updatedAt: string;
};
