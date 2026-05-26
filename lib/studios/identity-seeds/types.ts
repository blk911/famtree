// lib/studios/identity-seeds/types.ts
// Shared types for the reusable Identity Seed Assembler pipeline.
// Used by StyleSeat, Education Seeds, and any future source adapters.

import type { EducationType, AudienceType } from "@/lib/studios/creator-lab/hashtag-harvest/education-config";
import type { ResolveMode } from "@/lib/studios/creator-lab/ig-stubs/types";
import type { MatchedUrl } from "@/lib/studios/prospects/types";

// Re-export for consumers
export type { EducationType, AudienceType, ResolveMode };

// ─── Identity Seed (input to the assembler) ───────────────────────────────────

export interface IdentitySeed {
  /** Display name — source of truth for candidate generation */
  name: string;
  /** Known IG handle — if provided, it becomes candidate #1 (skips guessing) */
  handle?: string | null;
  /** City name — used for city-suffix candidates and locationGuess */
  city?: string | null;
  /** State abbreviation — stored in locationGuess */
  state?: string | null;
  /** Top-level vertical, e.g. "education" | "beauty" | "fitness" */
  vertical: string;
  /** Subcategory within the vertical, e.g. "homeschool" | "hair" */
  category?: string | null;
  /** Sub-subcategory for more granular classification */
  subcategory?: string | null;
  /** Source platform, e.g. "instagram" | "tiktok" | "styleseat" */
  sourcePlatform: string;
  /** Tool that produced this seed, e.g. "education_seed_import" | "styleseat_harvest" */
  sourceTool: string;
  /** ISO date of seed creation / harvest date */
  seedDate: string;
  /** Batch / run ID this seed belongs to */
  batchId: string;
  /** Run ID from the upstream harvest (null if manually created) */
  runId: string | null;
  /** Primary hashtag or source tag, e.g. "homeschool" */
  sourceHashtag?: string | null;
  /** All source hashtags accumulated across runs */
  sourceHashtags?: string[];
  /** Education-specific: type of education service */
  educationType?: EducationType | null;
  /** Education-specific: target audience */
  audienceType?: AudienceType | null;
  /** Topic string, e.g. "homeschool" or "lash" */
  sourceTopic?: string | null;
  /** Pre-known anchor URLs (e.g. StyleSeat listing, Linktree) */
  knownUrls?: MatchedUrl[];
  /** Raw bio text — included in evidence */
  bio?: string | null;
  /** Additional context strings to include in evidence */
  extraEvidence?: string[];
  /** Pre-known service list */
  services?: string[];
}

// ─── Assembler options ────────────────────────────────────────────────────────

export interface IdentityAssemblerOptions {
  /** Resolve mode: "fast" (URL probe only) or "deep" (full research) */
  mode: ResolveMode;
  /** Max candidates to try per seed (default 8) */
  maxCandidatesPerSeed?: number;
  /** Max seeds to process per run — cost guard (default 40) */
  maxSeeds?: number;
  /** Min confidence threshold to count an IG match as "found" (default 20) */
  igConfidenceThreshold?: number;
  /** If true, build UpsertInput but do NOT call upsertProspect */
  dryRun?: boolean;
  /** Override labels used in buildProspectSourcePath */
  sourcePathOverrides?: {
    verticalLabel?: string;
    platformLabel?: string;
    toolLabel?: string;
  };
}

// ─── Per-seed assembler result ────────────────────────────────────────────────

export type AssemblerStatus = "ig_verified" | "ig_candidate" | "unresolved";

export interface IdentityAssemblerResult {
  seed: IdentitySeed;
  /** Best IG handle found (no @), or null */
  igHandleFound: string | null;
  /** How many candidate handles were tried */
  igCandidatesTried: number;
  /** Confidence score of the best IG match (0–100) */
  igConfidence: number;
  /** True if igHandleFound and confidence ≥ igConfidenceThreshold */
  resolved: boolean;
  /** Prospect record ID after upsert (null if not saved) */
  prospectId: string | null;
  /** True if upsertProspect succeeded (or dryRun) */
  saved: boolean;
  /** Error message if upsert failed */
  saveError: string | null;
  /** IG resolution quality */
  status: AssemblerStatus;
}

// ─── Full run result ──────────────────────────────────────────────────────────

export interface IdentityAssemblerRunResult {
  results: IdentityAssemblerResult[];
  savedCount: number;
  failedToSaveCount: number;
  saveErrors: Array<{ handle: string; message: string }>;
  totalIgFound: number;
  savedHandles: string[];
  totalAttempted: number;
}
