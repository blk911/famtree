// types/studios.ts
// AIH Studios — type definitions
// First-pass scaffold: types only. Backend wiring deferred.

// ─── Status enums ──────────────────────────────────────────────
export type StudioRelationshipStatus =
  | "prospect"
  | "probation"
  | "member"
  | "external"
  | "blocked";

export type StudioRequestStatus =
  | "pending_review"
  | "approved_trial"
  | "member"
  | "external"
  | "archived"
  | "blocked";

export type ProviderCategory =
  | "trainer"
  | "strength_coach"
  | "mobility"
  | "massage"
  | "physical_therapy"
  | "sports_medicine"
  | "recovery"
  | "sauna_cryo"
  | "hydration_iv"
  | "nutrition"
  | "performance_coach";

export type OfferPackageType =
  | "intro"
  | "single"
  | "three_session"
  | "custom";

// ─── Display labels for categories ─────────────────────────────
export const PROVIDER_CATEGORY_LABELS: Record<ProviderCategory, string> = {
  trainer:           "Personal Trainer",
  strength_coach:    "Strength Coach",
  mobility:          "Mobility Specialist",
  massage:           "Massage Therapy",
  physical_therapy:  "Physical Therapy",
  sports_medicine:   "Sports Medicine",
  recovery:          "Recovery Specialist",
  sauna_cryo:        "Sauna & Cryo",
  hydration_iv:      "IV Hydration",
  nutrition:         "Nutrition",
  performance_coach: "Performance Coach",
};

// ─── Core entities ─────────────────────────────────────────────

export interface Studio {
  id: string;
  ownerProviderId: string;
  name: string;
  slug: string;
  description?: string;
  locationLabel?: string;
  city?: string;
  state?: string;
  imageUrl?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Provider {
  id: string;
  displayName: string;
  slug: string;
  category: ProviderCategory;
  serviceType?: string;
  locationLabel?: string;
  city?: string;
  state?: string;
  imageUrl?: string;
  introVideoUrl?: string;
  bio?: string;
  claimed: boolean;
  active: boolean;
  studioId?: string;
  createdAt: Date;
}

export interface StudioOffer {
  id: string;
  studioId: string;
  providerId: string;
  title: string;
  description: string;
  priceCents: number;
  durationMinutes: number;
  packageType: OfferPackageType;
  active: boolean;
  // TODO(studios:stripe): wire connect/charge here
}

export interface StudioRequest {
  id: string;
  studioId: string;
  providerId: string;
  userId?: string;            // null when newbie applies pre-account
  applicantName: string;
  applicantEmail: string;
  offerId?: string;
  status: StudioRequestStatus;
  applicantVideoUrl?: string;
  trainerIntroVideoUrl?: string;
  answers?: Record<string, string>;
  form?: string;
  createdAt: Date;
  reviewedAt?: Date;
  // TODO(studios:video): replace placeholder with intro upload
}

export interface StudioRelationship {
  id: string;
  studioId: string;
  providerId: string;
  userId: string;
  status: StudioRelationshipStatus;
  sessionsCompleted: number;
  purchasesCompleted: number;
  lastInteractionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudioVideo {
  id: string;
  studioId?: string;
  providerId?: string;
  url: string;
  caption?: string;
  durationSeconds?: number;
  uploadedAt: Date;
}

export interface StudioAdminLog {
  id: string;
  adminUserId: string;
  action: string;
  targetType: "provider" | "studio" | "request" | "offer";
  targetId: string;
  notes?: string;
  createdAt: Date;
}

// ─── Marketing types (used on public landing) ──────────────────
export interface StudioTestimonial {
  id: string;
  quote: string;
  attribution: string;
  role?: string;
  imageUrl?: string;
}
