// lib/intelligence/salon/google-identity/types.ts
// Observation-only Google Business reference layer (no prospect mutation).

import type { GoogleIdentityConnectionDiagnostics } from "./google-identity-connection";

export type { GoogleIdentityConnectionDiagnostics };

export type GoogleIdentityStatus =
  | "confirmed"
  | "probable"
  | "possible"
  | "conflict"
  | "not_found";

export type GoogleIdentityRecord = {
  prospectId: string;
  googlePlaceId?: string;
  googleBusinessName?: string;
  googleAddress?: string;
  googlePhone?: string;
  googleWebsite?: string;
  googleMapsUrl?: string;
  rating?: number;
  reviewCount?: number;
  categories?: string[];
  claimedBusiness?: boolean;
  permanentlyClosed?: boolean;
  matchConfidence: number;
  matchReason: string;
  status: GoogleIdentityStatus;
  evidence: string[];
  createdAt: string;
  updatedAt: string;
};

export type GoogleIdentitySummary = {
  totalProspects: number;
  confirmed: number;
  probable: number;
  possible: number;
  conflict: number;
  notFound: number;
  coveragePercent: number;
};

export type GoogleIdentityConflictRow = {
  prospectId: string;
  displayName?: string;
  instagramHandle?: string;
  status: GoogleIdentityStatus;
  issues: string[];
  googleWebsite?: string;
  prospectWebsite?: string;
};

export type GoogleIdentityByProvider = {
  provider: string;
  providerLabel: string;
  total: number;
  withGoogleMatch: number;
  confirmed: number;
  coveragePercent: number;
};

export type GoogleIdentityQuestions = {
  q1_matched_google: string;
  q2_confirmed: string;
  q3_probable: string;
  q4_possible: string;
  q5_conflicts: string;
  q6_not_found: string;
  q7_strongest_provider_coverage: string;
  q8_weakest_provider_coverage: string;
  q9_coverage_percent: string;
  q10_manual_review: string;
};

export type GoogleIdentityReport = {
  ok: true;
  summary: GoogleIdentitySummary;
  records: GoogleIdentityRecord[];
  conflicts: GoogleIdentityConflictRow[];
  questions: GoogleIdentityQuestions;
  byProvider: GoogleIdentityByProvider[];
  computedAt: string;
  fromCache: boolean;
  providerConnected: boolean;
  /** Safe server-runtime env diagnostics (no secret values). */
  connection: GoogleIdentityConnectionDiagnostics;
};

export type GoogleIdentityProspectInput = {
  prospectId: string;
  displayName?: string;
  city?: string;
  state?: string;
  phone?: string;
  website?: string;
  instagramHandle?: string;
  bookingProvider?: string;
  bookingProviderLabel?: string;
};
