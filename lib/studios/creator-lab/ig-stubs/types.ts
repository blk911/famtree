// lib/studios/creator-lab/ig-stubs/types.ts
// Types for the IG Stub Resolver — public namespace search + booking/store validation.

// ─── Inputs ───────────────────────────────────────────────────────────────────

export interface IgSeed {
  handle: string;       // sanitized, no @
  displayName: string;
}

export type ResolveMode = "fast" | "deep";

export interface ResolveRequest {
  seeds: IgSeed[];
  mode: ResolveMode;
}

// ─── Intermediate fetch result ────────────────────────────────────────────────

export interface CandidateFetch {
  url: string;
  platform: string;
  ok: boolean;
  httpStatus: number;
  finalUrl: string;     // after redirects
  title: string | null;
  description: string | null;
  bodyText: string;     // visible text, first ~4000 chars
  instagramLinks: string[];
  allLinks: string[];
  imageUrls: string[];
}

// ─── Output ───────────────────────────────────────────────────────────────────

export interface ResolvedProfile {
  platform: string;
  url: string;
  matchReason: string;
  extractedTitle: string | null;
  extractedDescription: string | null;
  detectedName: string | null;
  detectedLocation: string | null;
  detectedServices: string[];
  detectedPrices: string[];
  detectedSocialLinks: string[];
  confidenceScore: number;
  evidenceSnippets: string[];
}

/** A candidate URL that was tested but rejected during resolution. */
export interface RejectedCandidate {
  url: string;
  platform: string;
  /** Why it was rejected: "not_found" | "dead_page_or_low_score" | "appointment_platform_unverified" |
   *  "display_name_confirmed" (should not appear here) | "fetch_error" | "low_score_or_dead" */
  reason: string;
}

/** Per-handle resolver trace — returned for debugging and shown in UI. */
export interface ResolverTrace {
  handle: string;
  profileFetch: {
    attempted: boolean;
    found: boolean;
    externalUrl: string | null;
    biography: string | null;
    bioUrls: string[];
    error: string | null;
  };
  extracted: {
    allDirectUrls: string[];
    providerFromDirectUrl: string | null;
    providerFromDirectUrlSource: string | null;
    websiteUrl: string | null;
  };
  generatedCandidates: {
    count: number;
    linkTrailBookingUrls: string[];
  };
  resolverDecision: {
    status: string;
    bestUrl: string | null;
    platform: string | null;
    confidence: number;
    reason: string;
  };
}

export interface StubResolutionResult {
  seed: IgSeed;
  resolvedProfiles: ResolvedProfile[];  // confirmed matches only, sorted by score
  bestMatch: ResolvedProfile | null;
  status: "resolved" | "partial" | "unresolved";
  /** All candidate URLs that were tested in this resolution pass */
  candidateUrlsTested?: string[];
  /** Candidates that were fetched but rejected (not_found, unverified, low_score, etc.) */
  rejectedCandidates?: RejectedCandidate[];
  /** Booking URLs extracted from link-in-bio page HTML (one-hop, existing fetch only). */
  linkTrailUrls?: string[];
  /** Full resolver trace for debugging — included in debug mode and in IG Resolver UI. */
  trace?: ResolverTrace;
}

// ─── API shapes ───────────────────────────────────────────────────────────────

export interface ResolveResponse {
  ok: true;
  results: StubResolutionResult[];
  mode: ResolveMode;
  processedAt: string;
}

export interface ResolveErrorResponse {
  ok: false;
  error: string;
  detail?: string;
}
