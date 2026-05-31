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

  // Address classification
  addressType?: TranspoAddressType;

  verificationScore: number;
  verificationStatus: TranspoVerificationStatus;
  notes: string[];
  providersChecked: TranspoVerificationProvider[];
  createdAt: string;
  updatedAt: string;
};
