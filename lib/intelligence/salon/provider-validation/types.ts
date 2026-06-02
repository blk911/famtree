// lib/intelligence/salon/provider-validation/types.ts

export type SalonProviderCandidateSource =
  | "direct_url"
  | "link_in_bio"
  | "website_link"
  | "website_html"
  | "public_search"
  | "handle_guess"
  | "display_guess";

export type SalonProviderValidationStatus =
  | "confirmed"
  | "candidate_only"
  | "rejected_generic_homepage"
  | "rejected_marketing_page"
  | "rejected_login_signup"
  | "rejected_not_found"
  | "rejected_redirect_home"
  | "rejected_wrong_provider"
  | "blocked"
  | "timeout"
  | "error";

export type SalonProviderCandidate = {
  id: string;
  prospectId?: string;
  provider: string;
  providerLabel: string;
  candidateUrl: string;
  source: SalonProviderCandidateSource;
  confidenceHint: number;
  generated: boolean;
  createdAt: string;
};

export type SalonProviderValidation = {
  candidateId?: string;
  prospectId?: string;
  provider: string;
  providerLabel: string;
  candidateUrl: string;
  finalUrl?: string;
  status: SalonProviderValidationStatus;
  confirmed: boolean;
  confidence: number;
  statusCode?: number;
  positiveMarkers: string[];
  negativeMarkers: string[];
  reason: string;
  validatedAt: string;
  source?: SalonProviderCandidateSource;
  generated?: boolean;
};

export type ProviderValidationDiagnostics = {
  candidates: SalonProviderCandidate[];
  validations: SalonProviderValidation[];
  confirmed?: SalonProviderValidation;
};

export type ProviderDiscoveryPipelineResult = {
  candidates: SalonProviderCandidate[];
  validations: SalonProviderValidation[];
  confirmed?: SalonProviderValidation;
  bookingFields?: ConfirmedBookingFields;
  diagnostics: ProviderValidationDiagnostics;
};

export type ConfirmedBookingFields = {
  bookingProvider: string;
  bookingProviderLabel: string;
  bookingUrl: string;
  bookingProviderConfidence: number;
  bookingProviderEvidence: string[];
  bookingProviderSource: string;
  ggValidationStatus?: string;
  ggValidatedUrl?: string;
};

export type ProviderBackfillStats = {
  checked: number;
  candidatesFound: number;
  validationsRun: number;
  confirmedProviders: number;
  rejectedGenericHomepage: number;
  rejectedNotFound: number;
  downgradedFalsePositives: number;
  providersByType: Record<string, number>;
};
