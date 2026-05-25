// lib/studios/prospects/types.ts
// Creator Prospect Directory — admin-only intelligence from IG Stub Resolver runs.
// NOT member-facing. Not exposed on public pages.

export type ProspectStatus =
  | "new"
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
  sourceType: "ig-stub-run";
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

// ─── Confidence breakdown ─────────────────────────────────────────────────────

export interface ProspectConfidenceBreakdown {
  identityMatch: number;  // handle/name match signal
  bookingMatch: number;   // quality of booking platform found
  categoryMatch: number;  // service/category signal
  locationMatch: number;  // location signal
  overall: number;        // composite 0–100
}

// ─── Full record ──────────────────────────────────────────────────────────────

export interface ProspectRecord {
  prospectId: string;
  createdAt: string;   // ISO-8601
  updatedAt: string;
  source: ProspectSource;
  identity: ProspectIdentity;
  bestMatch: ProspectBestMatch | null;
  services: string[];
  allMatchedUrls: MatchedUrl[];
  evidence: string[];
  confidence: ProspectConfidenceBreakdown;
  status: ProspectStatus;
  notes: string;
}

// ─── API shapes ───────────────────────────────────────────────────────────────

export interface ProspectListResponse {
  ok: true;
  prospects: ProspectRecord[];
  total: number;
}

export interface ProspectUpdateRequest {
  prospectId: string;
  status?: ProspectStatus;
  notes?: string;
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
