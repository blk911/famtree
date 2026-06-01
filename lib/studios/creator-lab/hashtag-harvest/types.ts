// lib/studios/creator-lab/hashtag-harvest/types.ts
// Types for the Hashtag Harvest pipeline — admin-only, internal tooling only.

import type { ResolveMode } from "@/lib/studios/creator-lab/ig-stubs/types";
import type { EducationType, AudienceType } from "./education-config";

// ─── Apify raw output ─────────────────────────────────────────────────────────

/** Raw post item as returned by Apify Instagram hashtag scraper */
export interface ApifyPost {
  // identity — field names vary across actor versions; handle all
  ownerUsername?: string;
  owner?: { username?: string; fullName?: string; id?: string };
  username?: string;

  // display name
  ownerFullName?: string;
  fullName?: string;

  // content
  caption?: string;
  hashtags?: string[];

  // links
  url?: string;
  shortCode?: string;
  postUrl?: string;

  // media
  imageUrl?: string;
  thumbnailUrl?: string;
  displayUrl?: string;

  // meta
  timestamp?: string;
  likesCount?: number;
  commentsCount?: number;
  id?: string;
}

// ─── Extracted creator seed ───────────────────────────────────────────────────

export interface HarvestedCreatorSeed {
  handle: string;
  displayName: string;
  profileUrl: string | null;
  sourceHashtag: string;           // which hashtag this came from
  captionSnippet: string | null;   // first 200 chars of caption
  postUrl: string | null;
  imageUrl: string | null;
  detectedCategory: string | null;
  detectedLocation: string | null;
  // ── Vertical-aware classification (set by classify() router) ─────────────────
  verticalKey: string;             // e.g. "education" | "salon"
  primaryType: string | null;      // vertical-specific primary type (e.g. "tutor", "nails")
  secondaryType: string | null;    // vertical-specific secondary type (e.g. "educator", "operator")
  primaryLabel: string | null;     // human-readable label for primaryType
  secondaryLabel: string | null;   // human-readable label for secondaryType
  classifierSignals: string[];     // signals that drove the classification
  // ── Education-specific (backward compat — set when verticalKey === "education") ──
  educationType: EducationType | null;
  audienceType: AudienceType | null;
  evidence: string[];
}

// ─── Resolver pipeline result ─────────────────────────────────────────────────

export interface ResolverPipelineResult {
  seed: HarvestedCreatorSeed;
  resolved: boolean;
  bestMatchUrl: string | null;
  bestMatchPlatform: string | null;
  matchedUrlCount: number;
  prospectId: string | null;
  confidence: number;
  notes: string;
  /** Non-null when the upsert write failed for this seed */
  saveError: string | null;
}

// ─── Save error ───────────────────────────────────────────────────────────────

export interface SaveError {
  handle: string;
  sourceHashtag: string;
  platform: string | null;
  message: string;
}

// ─── Resolver aggregate result ────────────────────────────────────────────────

export interface RunResolverResult {
  results: ResolverPipelineResult[];
  savedCount: number;
  failedToSaveCount: number;
  saveErrors: SaveError[];
  /** How many seeds the upsert loop attempted (== seeds.length) */
  upsertAttemptCount: number;
  /** prospectId of every successfully saved record */
  savedProspectIds: string[];
  /** @handle of every successfully saved record */
  savedHandles: string[];
}

// ─── Per-hashtag diagnostics ──────────────────────────────────────────────────

export interface HashtagHarvestHashtagStats {
  hashtag: string;
  postsPulled: number;
  creatorsFound: number;
  creatorsDeduped: number;
  bookingProvidersFound: number;
  finalProspects: number;
}

export interface HashtagHarvestStatsTotals {
  postsPulled: number;
  creatorsFound: number;
  creatorsDeduped: number;
  bookingProvidersFound: number;
  finalProspects: number;
}

// ─── Harvest run ──────────────────────────────────────────────────────────────

export interface HashtagHarvestRun {
  runId: string;
  createdAt: string;
  hashtags: string[];
  market: string;
  category: string;
  mode: ResolveMode;
  apifyActorRunId: string | null;
  totalPosts: number;
  totalCreators: number;
  totalResolved: number;
  totalProspectsCreated: number;
  totalProspectsUpdated: number;
  savedCount: number;
  failedToSaveCount: number;
  saveErrors: SaveError[];
  errors: string[];
  // ── Save diagnostics ─────────────────────────────────────────────────────────
  prospectStorePath: string | null;
  prospectStoreBackend?: string;
  prospectsBeforeCount: number;
  prospectsAfterCount: number;
  upsertAttemptCount: number;
  savedProspectIds: string[];
  savedHandles: string[];
  /** Per-hashtag pipeline metrics + rolled-up totals */
  hashtagStats?: HashtagHarvestHashtagStats[];
  hashtagStatsTotals?: HashtagHarvestStatsTotals;
  /** Salon resolver / provider discovery rollup (salon harvests only) */
  resolverDiagnostics?: import("@/lib/intelligence/salon/salon-resolver-diagnostics").SalonResolverRunDiagnostics;
}

export interface HarvestRunFile {
  run: HashtagHarvestRun;
  creators: HarvestedCreatorSeed[];
  results: ResolverPipelineResult[];
}

// ─── API shapes ───────────────────────────────────────────────────────────────

export interface HarvestRunRequest {
  hashtags: string[];
  market: string;
  category: string;
  maxPerHashtag: number;
  mode: ResolveMode;
  verticalKey: string;
  /** Run GG resolver on all deduped prospects (no cap). */
  runGgOnAllDeduped?: boolean;
  /** Max GG probes per harvest when runGgOnAllDeduped is false (default 250). */
  ggMaxProbes?: number;
  /** Run public web search discovery after harvest (uses search API credits, max 50). */
  runPublicDiscovery?: boolean;
}

export interface HarvestRunResponse {
  ok: true;
  run: HashtagHarvestRun;
  creators: HarvestedCreatorSeed[];
  results: ResolverPipelineResult[];
  saveErrors: SaveError[];
}

export interface HarvestErrorResponse {
  ok: false;
  error: string;
  detail?: string;
}
