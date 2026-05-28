// lib/studios/styleseat/types.ts
// StyleSeat discovery pipeline — admin-only, internal tooling only.
// StyleSeat is an INTAKE SOURCE, not the resolver.
// All entities flow through the canonical IG resolver → prospect store.

import type { ResolveMode } from "@/lib/studios/creator-lab/ig-stubs/types";
import type { SaveError } from "@/lib/studios/creator-lab/hashtag-harvest/types";

// ─── Category config ──────────────────────────────────────────────────────────

export type StyleSeatCategory =
  | "hair"
  | "braids"
  | "barber"
  | "locs"
  | "makeup"
  | "lashes"
  | "brows"
  | "nails"
  | "extensions";

export type StyleSeatDiscoveryMode =
  | "aggregator_crawl"
  | "direct_url"
  | "market_search";

export const STYLESEAT_CATEGORY_LABELS: Record<StyleSeatCategory, string> = {
  hair:       "Hair",
  braids:     "Braids",
  barber:     "Barber",
  locs:       "Locs",
  makeup:     "Makeup",
  lashes:     "Lashes",
  brows:      "Brows",
  nails:      "Nails",
  extensions: "Extensions",
};

export const STYLESEAT_CATEGORY_SLUGS: Record<StyleSeatCategory, string> = {
  hair:       "hair-stylists",
  braids:     "braiders",
  barber:     "barbers",
  locs:       "loc-stylists",
  makeup:     "makeup-artists",
  lashes:     "lash-artists",
  brows:      "brow-artists",
  nails:      "nail-technicians",
  extensions: "hair-extension-specialists",
};

// ─── Operator status ──────────────────────────────────────────────────────────

export type StyleSeatOperatorStatus =
  | "styleseat_discovered"
  | "ig_candidate_found"
  | "ig_verified"
  | "resolver_merged"
  | "active_operator"
  | "unresolved"
  | "dead";

export const STYLESEAT_STATUS_LABELS: Record<StyleSeatOperatorStatus, string> = {
  styleseat_discovered: "StyleSeat Discovered",
  ig_candidate_found:   "IG Candidate Found",
  ig_verified:          "IG Verified",
  resolver_merged:      "Resolver Merged",
  active_operator:      "Active Operator",
  unresolved:           "Unresolved",
  dead:                 "Dead",
};

export const STYLESEAT_STATUS_COLORS: Record<StyleSeatOperatorStatus, { bg: string; fg: string }> = {
  styleseat_discovered: { bg: "#f5f5f4",  fg: "#78716c" },
  ig_candidate_found:   { bg: "#eff6ff",  fg: "#1d4ed8" },
  ig_verified:          { bg: "#dcfce7",  fg: "#15803d" },
  resolver_merged:      { bg: "#ede9fe",  fg: "#6d28d9" },
  active_operator:      { bg: "#fce7f3",  fg: "#9d174d" },
  unresolved:           { bg: "#fef3c7",  fg: "#b45309" },
  dead:                 { bg: "#fee2e2",  fg: "#b91c1c" },
};

// ─── Operator ─────────────────────────────────────────────────────────────────

export interface StyleSeatService {
  name: string;
  price: number | null;
  duration: number | null;
}

/** Raw operator data as extracted from StyleSeat listings */
export interface StyleSeatOperator {
  styleseatId: string;
  name: string;
  /** URL slug, e.g. "janelle-carter-beauty" */
  slug: string;
  styleseatUrl: string;
  city: string;
  state: string;
  categories: StyleSeatCategory[];
  specialties: string[];
  bio: string | null;
  services: StyleSeatService[];
  reviewCount: number;
  rating: number | null;
  imageUrl: string | null;
  priceRange: string | null;
  /** True when operator profile appears independent (not a chain salon) */
  isIndependent: boolean;
  harvestDate: string;
  batchId: string;
  discoveryMode?: StyleSeatDiscoveryMode;
  seedUrl?: string;
  sourceUrl?: string;
  rawText?: string;
  imageCount?: number;
  extractionSource?: "internal_api" | "static_links" | "embedded_json" | "none";
  rawApiRecord?: Record<string, unknown>;
}

// ─── Resolver result (per-operator) ───────────────────────────────────────────

export interface StyleSeatResolverResult {
  operator: StyleSeatOperator;
  /** Best IG handle found, null if none discovered */
  igHandleFound: string | null;
  /** How many candidate handles were tried */
  igCandidatesTried: number;
  resolved: boolean;
  bestMatchUrl: string | null;
  bestMatchPlatform: string | null;
  igConfidence: number;
  prospectId: string | null;
  status: StyleSeatOperatorStatus;
  notes: string;
  saveError: string | null;
}

export type StyleSeatPipelineMode =
  | "harvest_only"
  | "harvest_and_resolve"
  | "full_pipeline";

export interface StyleSeatRunTotals {
  crawledUrls?: number;
  profileUrls?: number;
  internalApiUrlsTried?: number;
  internalApiUrlsSucceeded?: number;
  internalApiUrlsFailed?: number;
  internalApiRecords?: number;
  harvested: number;
  normalized: number;
  igCandidates: number;
  resolverMerged: number;
  prospectsCreated: number;
  prospectsUpdated: number;
  prospectsAttempted?: number;
  prospectsSkipped?: number;
  prospectsFailed?: number;
  unresolved: number;
  failed: number;
}

export interface StyleSeatRequestEcho {
  discoveryMode: StyleSeatDiscoveryMode;
  sourceUrl: string | null;
  city: string;
  state: string;
  categories: StyleSeatCategory[];
  maxOperators: number;
  crawlDepth: number;
  pipelineMode: StyleSeatPipelineMode;
  resolverMode: ResolveMode;
  debug: boolean;
  generatedSearchUrls: string[];
  internalApiEligible: boolean;
  internalApiReason: string;
}

export interface StyleSeatExecutionPath {
  discoveryMode: StyleSeatDiscoveryMode;
  urlClassification: "profile" | "search" | "category" | "aggregator" | "market_search" | "unknown";
  enteredInternalApiPath: boolean;
  enteredStaticExtractionPath: boolean;
  enteredFallbackPath: boolean;
  generatedSearchUrls: string[];
  apiExtractionAttempted: boolean;
  apiExtractionSucceeded: boolean;
  extractionSource: "internal_api" | "static_links" | "embedded_json" | "none";
}

export interface StyleSeatProspectPersistenceAuditEntry {
  name: string;
  profileUrl: string | null;
  city: string | null;
  category: string | null;
  attemptedSave: boolean;
  saved: boolean;
  skippedReason: string | null;
  validationErrors: string[];
  prospectId: string | null;
  matchedExistingProspectId: string | null;
  resolverStatus: StyleSeatOperatorStatus | "not_resolved";
}

export interface StyleSeatProspectPersistenceAuditSummary {
  attempted: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  topSkipReasons: Array<{ reason: string; count: number }>;
}

export interface StyleSeatRunReport {
  runId: string;
  createdAt: string;
  discoveryMode?: StyleSeatDiscoveryMode;
  sourceUrl?: string | null;
  seedUrls?: string[];
  marketSearchInput?: { city: string; state: string } | null;
  market: string;
  categories: StyleSeatCategory[];
  crawlDepth?: number;
  maxOperators?: number;
  resolverMode?: ResolveMode;
  mode: StyleSeatPipelineMode;
  pipelineMode?: StyleSeatPipelineMode;
  totals: StyleSeatRunTotals;
  discoveredMarkets?: string[];
  discoveredCategories?: string[];
  extractionSource?: "internal_api" | "static_links" | "embedded_json" | "none";
  requestEcho?: StyleSeatRequestEcho;
  executionPath?: StyleSeatExecutionPath;
  artifactPaths: Record<string, string>;
  intelligenceSummary?: {
    topMarkets: string[];
    topCategories: string[];
    topOperators: string[];
    recommendationCount: number;
  };
  persistenceAuditSummary?: StyleSeatProspectPersistenceAuditSummary;
  notes: string[];
}

export interface StyleSeatCrawlResult {
  seedUrls: string[];
  crawledUrls: string[];
  profileUrls: string[];
  rejectedUrls: string[];
  discoveredMarkets: string[];
  discoveredCategories: string[];
  apiOperators?: StyleSeatOperator[];
  debug?: StyleSeatCrawlDebug;
}

export interface StyleSeatCrawlDebug {
  staticAnchorCount: number;
  renderedAnchorCount: number;
  firstInternalHrefs: string[];
  diagnosticsDir?: string;
  rawHtmlPath?: string;
  scriptsIndexPath?: string;
  embeddedJsonPath?: string;
  jsonLdPath?: string;
  allInternalLinksPath?: string;
  internalLinksPath?: string;
  urlClassificationPath?: string;
  networkHintsPath?: string;
  extractionReportPath?: string;
  renderedHtmlPath?: string;
  debugJsonPath?: string;
  extractionSource?: "internal_api" | "static_links" | "embedded_json" | "none";
  embeddedDataCount?: number;
  jsonScriptCount?: number;
  jsonLdCount?: number;
  nextDataFound?: boolean;
  nextFlightFound?: boolean;
  candidateObjectCount?: number;
  embeddedCandidateCount?: number;
  networkHintCount?: number;
  internalLinkCount?: number;
  profileLinkCount?: number;
  profileLikeLinkCount?: number;
  likelyExtractionSource?: "static_links" | "next_data" | "next_flight" | "json_ld" | "internal_api" | "rendered_dom_required" | "blocked_or_empty";
  recommendation?: string;
  searchApiUrl?: string;
  searchApiResultCount?: number;
  searchApiResponsePath?: string;
  internalApiUrlsTried?: string[];
  internalApiUrlsSucceeded?: string[];
  internalApiUrlsFailed?: Array<{ url: string; status?: number; error?: string }>;
  internalApiRecords?: number;
  internalApiDebugPath?: string;
  notes: string[];
  suggestedUrls: string[];
}

export interface StyleSeatExtractionDiagnosticSummary {
  staticAnchorCount: number;
  internalStyleSeatLinkCount: number;
  profileLikeLinkCount: number;
  jsonScriptCount: number;
  nextDataFound: boolean;
  nextFlightFound: boolean;
  jsonLdCount: number;
  candidateObjectCount: number;
  embeddedCandidateCount: number;
  networkHintCount: number;
  likelyExtractionSource: "static_links" | "next_data" | "next_flight" | "json_ld" | "internal_api" | "rendered_dom_required" | "blocked_or_empty";
  recommendation?: string;
  debugArtifactPath?: string;
}

export type StyleSeatOperatorLabel =
  | "creator_candidate"
  | "premium_operator"
  | "high_social_signal"
  | "independent_brand"
  | "likely_suite_renter"
  | "likely_mobile"
  | "emerging_creator";

export interface StyleSeatOperatorScore {
  operatorId: string;
  name: string;
  city: string;
  state: string;
  market: string;
  categories: StyleSeatCategory[];
  specialties: string[];
  score: number;
  resolverConfidence: number;
  labels: StyleSeatOperatorLabel[];
  signals: string[];
  igHandleFound: string | null;
  prospectId: string | null;
}

export interface StyleSeatMarketIntelligence {
  market: string;
  city: string;
  state: string;
  operatorCount: number;
  categoryCounts: Partial<Record<StyleSeatCategory, number>>;
  topSpecialties: string[];
  topServiceKeywords: string[];
  activeIGPercent: number;
  avgReviewCount: number;
  avgImageCount: number;
  mobileOperatorPercent: number;
  suiteOperatorPercent: number;
  unresolvedPercent: number;
  marketScore: number;
  summary: string;
}

export interface StyleSeatCategoryIntelligence {
  category: StyleSeatCategory;
  count: number;
  marketDistribution: Record<string, number>;
  IGActivePercent: number;
  avgReviews: number;
  topMarkets: string[];
  growthSignals: string[];
  score: number;
}

export interface StyleSeatMarketCluster {
  market: string;
  dominantCategories: string[];
  ecosystemType: string;
  operatorCount: number;
  avgSocialSignal: number;
  score: number;
  signals: string[];
}

export interface StyleSeatIntelligenceReport {
  runId: string;
  createdAt: string;
  markets: StyleSeatMarketIntelligence[];
  categories: StyleSeatCategoryIntelligence[];
  operators: StyleSeatOperatorScore[];
  clusters: StyleSeatMarketCluster[];
  insights: string[];
  recommendations: string[];
}

// ─── Harvest run summary ──────────────────────────────────────────────────────

export interface StyleSeatHarvestRun {
  runId: string;
  batchId: string;
  createdAt: string;
  market: string;
  state: string;
  discoveryMode?: StyleSeatDiscoveryMode;
  sourceUrl?: string | null;
  seedUrls?: string[];
  crawlDepth?: number;
  maxOperators?: number;
  discoveredMarkets?: string[];
  discoveredCategories?: string[];
  categories: StyleSeatCategory[];
  mode: StyleSeatPipelineMode;
  resolverMode: ResolveMode;
  apifyActorRunId: string | null;
  // Counts
  totalHarvested: number;
  totalIgFound: number;
  totalResolved: number;
  totalProspects: number;
  savedCount: number;
  failedToSaveCount: number;
  saveErrors: SaveError[];
  errors: string[];
  // Diagnostics
  prospectStorePath: string | null;
  prospectStoreBackend?: string;
  prospectsBeforeCount: number;
  prospectsAfterCount: number;
  savedHandles: string[];
  report?: StyleSeatRunReport;
}

/** Stored file shape — one per run */
export interface StyleSeatRunFile {
  run: StyleSeatHarvestRun;
  crawl?: StyleSeatCrawlResult | null;
  operators: StyleSeatOperator[];
  normalized?: unknown[];
  results: StyleSeatResolverResult[];
  prospects?: unknown[];
  failures?: unknown[];
  log?: unknown[];
  intelligence?: StyleSeatIntelligenceReport | null;
  operatorScores?: StyleSeatOperatorScore[];
  marketClusters?: StyleSeatMarketCluster[];
  prospectPersistenceAudit?: StyleSeatProspectPersistenceAuditEntry[];
  requestEcho?: StyleSeatRequestEcho;
  executionPath?: StyleSeatExecutionPath;
  generatedSearchUrls?: string[];
  report?: StyleSeatRunReport;
}

// ─── Run config ───────────────────────────────────────────────────────────────

export interface StyleSeatRunConfig {
  runId?: string;
  debug?: boolean;
  discoveryMode?: StyleSeatDiscoveryMode;
  sourceUrl?: string;
  market: string;
  state: string;
  categories: StyleSeatCategory[];
  maxResults: number;
  maxOperators?: number;
  crawlDepth?: number;
  mode: StyleSeatPipelineMode;
  resolverMode?: ResolveMode;
}

// ─── API shapes ───────────────────────────────────────────────────────────────

export interface StyleSeatRunRequest {
  debug?: boolean;
  discoveryMode?: StyleSeatDiscoveryMode;
  sourceUrl?: string;
  city?: string;
  market?: string;
  state?: string;
  categories?: StyleSeatCategory[];
  maxResults?: number;
  maxOperators?: number;
  crawlDepth?: number;
  mode?: ResolveMode | StyleSeatPipelineMode;
  pipelineMode?: StyleSeatPipelineMode;
  resolverMode?: ResolveMode;
}

export interface StyleSeatRunResponse {
  ok: true;
  run: StyleSeatHarvestRun;
  crawl?: StyleSeatCrawlResult | null;
  operators: StyleSeatOperator[];
  normalized?: unknown[];
  results: StyleSeatResolverResult[];
  prospects?: unknown[];
  failures?: unknown[];
  prospectPersistenceAudit?: StyleSeatProspectPersistenceAuditEntry[];
  log?: unknown[];
  intelligence?: StyleSeatIntelligenceReport | null;
  report?: StyleSeatRunReport;
  requestEcho?: StyleSeatRequestEcho;
  executionPath?: StyleSeatExecutionPath;
  diagnosticSummary?: StyleSeatExtractionDiagnosticSummary;
}

export interface StyleSeatErrorResponse {
  ok: false;
  error: string;
  detail?: string;
}

export interface StyleSeatListResponse {
  ok: true;
  runs: StyleSeatHarvestRun[];
  total: number;
}

export interface StyleSeatDetailResponse {
  ok: true;
  run: StyleSeatHarvestRun;
  crawl: StyleSeatCrawlResult | null;
  operators: StyleSeatOperator[];
  raw: StyleSeatOperator[];
  normalized: unknown[];
  results: StyleSeatResolverResult[];
  prospects: unknown[];
  failures: unknown[];
  prospectPersistenceAudit?: StyleSeatProspectPersistenceAuditEntry[];
  log: unknown[];
  intelligence: StyleSeatIntelligenceReport | null;
  report: StyleSeatRunReport | null;
  requestEcho?: StyleSeatRequestEcho;
  executionPath?: StyleSeatExecutionPath;
}
