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

export interface StubResolutionResult {
  seed: IgSeed;
  resolvedProfiles: ResolvedProfile[];  // all matches, sorted by score
  bestMatch: ResolvedProfile | null;
  status: "resolved" | "partial" | "unresolved";
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
