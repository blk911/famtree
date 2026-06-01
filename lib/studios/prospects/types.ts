// lib/studios/prospects/types.ts
// Creator Prospect Directory — admin-only intelligence from IG Stub Resolver runs.
// NOT member-facing. Not exposed on public pages.

import type {
  EducationType,
  AudienceType,
  ValidationStatus,
} from "@/lib/studios/creator-lab/hashtag-harvest/education-config";
import type { BusinessCategory, RelationshipOpportunityType } from "./opportunity-taxonomy";
import type { PlatformSignal } from "./platform-signals";

// Re-export for consumers that only import from this module
export type { EducationType, AudienceType, ValidationStatus };

// ─── CRM status (human-managed workflow) ─────────────────────────────────────

export type ProspectStatus =
  | "new"
  | "styleseat_discovered"
  | "reviewed"
  | "good_fit"
  | "maybe"
  | "bad_fit"
  | "contacted"
  | "registered"
  | "claimed"
  | "converted";

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  new:        "New",
  styleseat_discovered: "StyleSeat Discovered",
  reviewed:   "Reviewed",
  good_fit:   "Good Fit",
  maybe:      "Maybe",
  bad_fit:    "Bad Fit",
  contacted:  "Contacted",
  registered: "Registered",
  claimed:    "Claimed",
  converted:  "Converted",
};

export const PROSPECT_STATUS_COLORS: Record<ProspectStatus, { bg: string; fg: string }> = {
  new:        { bg: "#f5f5f4", fg: "#78716c" },
  styleseat_discovered: { bg: "#f5f5f4", fg: "#78716c" },
  reviewed:   { bg: "#eff6ff", fg: "#1d4ed8" },
  good_fit:   { bg: "#dcfce7", fg: "#15803d" },
  maybe:      { bg: "#fef3c7", fg: "#b45309" },
  bad_fit:    { bg: "#fee2e2", fg: "#b91c1c" },
  contacted:  { bg: "#f0fdf4", fg: "#166534" },
  registered: { bg: "#ede9fe", fg: "#6d28d9" },
  claimed:    { bg: "#fce7f3", fg: "#9d174d" },
  converted:  { bg: "#14532d", fg: "#bbf7d0" },
};

// ─── Source ───────────────────────────────────────────────────────────────────

export interface ProspectSource {
  sourceType:
    | "ig-stub-run"
    | "hashtag_harvest"
    | "styleseat_harvest"
    | "education_seed_import"
    | "education_directory_import";
  batchId: string;
  sourceHandle: string;
  sourceDisplayName: string;
}

// ─── Identity ─────────────────────────────────────────────────────────────────

export interface ProspectIdentity {
  name: string;
  handle: string;
  categoryGuess: string | null;
  locationGuess: string | null;
}

// ─── Match data ───────────────────────────────────────────────────────────────

export interface ProspectBestMatch {
  platform: string;
  url: string;
  confidence: number;
  matchReason: string;
}

export interface MatchedUrl {
  platform: string;
  url: string;
  confidence: number;
  matchReason: string;
}

export type ProspectEvidenceType = "styleseat_profile";

export interface StructuredProspectEvidence {
  type: ProspectEvidenceType;
  source: string;
  url: string;
  label: string;
  city?: string;
  state?: string;
  serviceCategory?: string | null;
  confidence?: number;
}

export type ProspectEvidence = string | StructuredProspectEvidence;

// ─── Confidence breakdown ─────────────────────────────────────────────────────

export interface ProspectConfidenceBreakdown {
  identityMatch: number;
  bookingMatch: number;
  categoryMatch: number;
  locationMatch: number;
  overall: number;
}

// ─── Full record ──────────────────────────────────────────────────────────────

export interface ProspectRecord {
  prospectId: string;
  identityFingerprint: string;
  createdAt: string;   // ISO-8601
  updatedAt: string;

  // ── Source provenance ────────────────────────────────────────────────────────
  source: ProspectSource;

  /** Top-level vertical: "education" | "fitness" | etc. */
  vertical: string;
  /** Platform scraped from: "instagram" | "tiktok" | etc. */
  sourcePlatform: string;
  /** Tool that produced this record: "hashtag_harvest" | "ig-stub-run" */
  sourceTool: string;
  /** Primary hashtag this creator was found under */
  sourceHashtag: string | null;
  /** All hashtags this creator has appeared in (across runs) */
  sourceHashtags: string[];
  /**
   * Human-readable source path:
   * "Education / Instagram / Hashtag Harvest / 2026-05-26 / #homeschool"
   */
  sourcePath: string;
  /** Harvest run ID */
  runId: string | null;
  /** ISO date of harvest */
  harvestDate: string | null;

  // ── Identity ─────────────────────────────────────────────────────────────────
  identity: ProspectIdentity;

  // ── Education classification ─────────────────────────────────────────────────
  educationType: EducationType | null;
  audienceType: AudienceType | null;
  sourceTopic: string | null;

  // ── Relationship opportunity classification ────────────────────────────────
  businessCategory?: BusinessCategory | string | null;
  businessSubcategory?: string | null;
  relationshipOpportunityType?: RelationshipOpportunityType | string | null;
  relationshipScore?: number | null;
  audienceScore?: number | null;
  operationalDataScore?: number | null;
  communityScore?: number | null;
  overallOpportunityScore?: number | null;
  offerFitTags?: string[];
  platformSignals?: PlatformSignal[] | string[];
  categoryConfidence?: number | null;
  classificationNotes?: string[];
  classificationLocked?: boolean;

  // ── Salon booking provider (public link-trail detection) ───────────────────
  bookingProvider?: string;
  bookingProviderLabel?: string;
  bookingUrl?: string;
  bookingProviderConfidence?: number;
  bookingProviderEvidence?: string[];

  // ── Intelligence status ──────────────────────────────────────────────────────
  /**
   * Intelligence/validation classification — system-assigned, human-overridable.
   * NEVER overwritten by re-runs if human has set it.
   */
  validationStatus: ValidationStatus;
  /** Only set when validationStatus === "archive" */
  archiveReason: string | null;

  // ── Match data ───────────────────────────────────────────────────────────────
  bestMatch: ProspectBestMatch | null;
  /** All detected external platforms */
  platforms: string[];
  services: string[];
  /** Confirmed matched URLs only — unverified generated candidates are excluded */
  allMatchedUrls: MatchedUrl[];
  evidence: ProspectEvidence[];
  confidence: ProspectConfidenceBreakdown;

  // ── URL verification diagnostics (set by resolver, read-only) ────────────────
  /** All candidate URLs that were tested during resolution (for debugging) */
  candidateUrlsTested?: string[];
  /** Candidates that were fetched but rejected before becoming evidence */
  rejectedCandidateUrls?: Array<{ url: string; platform: string; reason: string }>;

  // ── Human-managed CRM ────────────────────────────────────────────────────────
  /** CRM workflow status — NEVER overwritten by re-runs */
  status: ProspectStatus;
  /** Admin notes — NEVER overwritten by re-runs */
  notes: string;
}

// ─── API shapes ───────────────────────────────────────────────────────────────

export interface ProspectListResponse {
  ok: true;
  items?: ProspectRecord[];
  prospects: ProspectRecord[];
  total: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  selectedBackend?: string;
  backendInfo?: {
    backend: string;
    storePath: string | null;
    envSetting: string;
  };
  pagination?: {
    limit: number;
    offset: number;
    returned: number;
    hasMore: boolean;
  };
  backend?: string;
  storePath?: string | null;
  warnings?: string[];
}

export interface ProspectUpdateRequest {
  prospectId: string;
  status?: ProspectStatus;
  validationStatus?: ValidationStatus;
  notes?: string;
  archiveReason?: string | null;
}

export interface ProspectUpdateResponse {
  ok: true;
  prospect: ProspectRecord;
}

export interface ProspectErrorResponse {
  ok: false;
  error: string;
  detail?: string;
}
