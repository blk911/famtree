// lib/markets/types.ts

export type MarketCategoryBucket =
  | "hair"
  | "nails"
  | "skin"
  | "lashes"
  | "barber"
  | "massage"
  | "wax"
  | "other";

export type MarketVerificationStatus = "live_verified" | "matched" | "discovered";

export type MarketRecommendedAction =
  | "call_or_text"
  | "booking_profile_review"
  | "needs_manual_validation";

export type MarketReviewStatus =
  | "unreviewed"
  | "valid"
  | "bad_data"
  | "duplicate"
  | "do_not_contact"
  | "priority";

export interface MarketCandidate {
  candidateKey: string;
  sourceProvider: string;
  sourceType: string;
  operatorName: string;
  displayName: string;
  professionalName?: string;
  businessName?: string;
  locationName?: string;
  locationSlug: string;
  city?: string;
  state?: string;
  suiteNumber?: string;
  categories: string[];
  categoryBuckets: MarketCategoryBucket[];
  phones: string[];
  emails: string[];
  bookingLinks: string[];
  website?: string;
  externalLinks?: string[];
  socialLinks: string[];
  profileUrl?: string;
  imageUrl?: string;
  bio?: string;
  parentContainerId: string;
  parentContainerBrand: string;
  parentContainerType: string;
  containerRelationship: string;
  verificationStatus: MarketVerificationStatus;
  contactabilityScore: number;
  identityScore: number;
  acquisitionScore: number;
  recommendedAction: MarketRecommendedAction;
  reviewStatus: MarketReviewStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketSourceRegistryEntry {
  count: number;
  artifactPath: string;
  lastImportedAt: string;
}

export interface MarketCandidatesArtifact {
  generatedAt: string;
  total: number;
  sources: Record<string, MarketSourceRegistryEntry>;
  candidates: MarketCandidate[];
}
