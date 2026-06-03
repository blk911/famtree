// lib/intelligence/salon/provider-provenance/types.ts

export type ProviderAssignmentSource =
  | "styleseat_directory"
  | "direct_url"
  | "link_in_bio"
  | "website_link"
  | "website_html"
  | "provider_validation"
  | "generated_candidate"
  | "handle_guess"
  | "display_name_guess"
  | "public_presence"
  | "business_stack"
  | "manual"
  | "unknown";

export type ProviderProvenanceRecord = {
  id: string;
  prospectId: string;
  instagramHandle?: string;
  displayName?: string;
  provider: string;
  providerLabel: string;
  assignmentSource: ProviderAssignmentSource;
  validationStatus?: string;
  confirmed: boolean;
  confidence?: number;
  candidateUrl?: string;
  validatedUrl?: string;
  reason: string;
  evidence: string[];
  createdAt: string;
  updatedAt: string;
};

export type ProviderProvenanceByProvider = {
  provider: string;
  providerLabel: string;
  total: number;
  confirmed: number;
  generated: number;
  rejected: number;
  unknown: number;
  trustScore: number;
};

export type ProviderProvenanceSummary = {
  totalAssignments: number;
  confirmedAssignments: number;
  generatedAssignments: number;
  rejectedAssignments: number;
  unknownAssignments: number;
  badAssignments: number;
  byProvider: ProviderProvenanceByProvider[];
  /** Explainable provenance coverage (confirmed or auditable evidence trail). */
  provenanceCoveragePercent: number;
  assignmentsWithProvenance: number;
  assignmentsWithoutProvenance: number;
  /** Stored vs display-gate (bookingProviderForDisplay). */
  storedAssignments: number;
  displayEligibleAssignments: number;
  hiddenUnconfirmedAssignments: number;
};

export type ProviderProvenanceBadAssignment = {
  prospectId: string;
  instagramHandle: string;
  displayName: string;
  provider: string;
  providerLabel: string;
  assignmentSource: ProviderAssignmentSource;
  validationStatus?: string;
  confirmed: boolean;
  candidateUrl?: string;
  validatedUrl?: string;
  reason: string;
  flags: string[];
};

export type ProviderProvenanceQuestions = {
  q1_total_assignments: string;
  q2_confirmed_count: string;
  q3_direct_evidence: string;
  q4_generated_candidates: string;
  q5_survived_validation: string;
  q6_without_proof: string;
  q7_weakest_provider: string;
  q8_strongest_provider: string;
  q9_provenance_coverage_pct: string;
  q10_hidden_stored_assignments: string;
};

export type ProviderProvenanceReport = {
  ok: true;
  summary: ProviderProvenanceSummary;
  records: ProviderProvenanceRecord[];
  badAssignments: ProviderProvenanceBadAssignment[];
  questions: ProviderProvenanceQuestions;
  computedAt: string;
  fromCache: boolean;
};

export const ASSIGNMENT_SOURCE_LABELS: Record<ProviderAssignmentSource, string> = {
  styleseat_directory: "StyleSeat directory",
  direct_url: "Direct URL",
  link_in_bio: "Link-in-bio",
  website_link: "Website link",
  website_html: "Website HTML",
  provider_validation: "Provider validation",
  generated_candidate: "Generated candidate",
  handle_guess: "Handle guess",
  display_name_guess: "Display name guess",
  public_presence: "Public presence",
  business_stack: "Business stack",
  manual: "Manual",
  unknown: "Unknown",
};
