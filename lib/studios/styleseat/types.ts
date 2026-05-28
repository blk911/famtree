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
  harvested: number;
  normalized: number;
  igCandidates: number;
  resolverMerged: number;
  prospectsCreated: number;
  prospectsUpdated: number;
  unresolved: number;
  failed: number;
}

export interface StyleSeatRunReport {
  runId: string;
  createdAt: string;
  market: string;
  categories: StyleSeatCategory[];
  mode: StyleSeatPipelineMode;
  totals: StyleSeatRunTotals;
  artifactPaths: Record<string, string>;
  notes: string[];
}

// ─── Harvest run summary ──────────────────────────────────────────────────────

export interface StyleSeatHarvestRun {
  runId: string;
  batchId: string;
  createdAt: string;
  market: string;
  state: string;
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
  operators: StyleSeatOperator[];
  normalized?: unknown[];
  results: StyleSeatResolverResult[];
  prospects?: unknown[];
  failures?: unknown[];
  log?: unknown[];
  report?: StyleSeatRunReport;
}

// ─── Run config ───────────────────────────────────────────────────────────────

export interface StyleSeatRunConfig {
  market: string;
  state: string;
  categories: StyleSeatCategory[];
  maxResults: number;
  mode: StyleSeatPipelineMode;
  resolverMode?: ResolveMode;
}

// ─── API shapes ───────────────────────────────────────────────────────────────

export interface StyleSeatRunRequest {
  market: string;
  state?: string;
  categories: StyleSeatCategory[];
  maxResults: number;
  mode: ResolveMode | StyleSeatPipelineMode;
  resolverMode?: ResolveMode;
}

export interface StyleSeatRunResponse {
  ok: true;
  run: StyleSeatHarvestRun;
  operators: StyleSeatOperator[];
  normalized?: unknown[];
  results: StyleSeatResolverResult[];
  prospects?: unknown[];
  failures?: unknown[];
  log?: unknown[];
  report?: StyleSeatRunReport;
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
  operators: StyleSeatOperator[];
  raw: StyleSeatOperator[];
  normalized: unknown[];
  results: StyleSeatResolverResult[];
  prospects: unknown[];
  failures: unknown[];
  log: unknown[];
  report: StyleSeatRunReport | null;
}
