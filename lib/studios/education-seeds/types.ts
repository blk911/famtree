// lib/studios/education-seeds/types.ts
// Types for the Education Manual Seed Import pipeline.
// Parses a textarea of educator identities → IdentitySeeds → prospects.

import type { EducationType, AudienceType } from "@/lib/studios/creator-lab/hashtag-harvest/education-config";
import type { IdentityAssemblerRunResult } from "@/lib/studios/identity-seeds/types";

export type { EducationType, AudienceType };

// ─── Parsed seed from textarea ────────────────────────────────────────────────

export interface ParsedEducationSeed {
  /** Raw line as typed by admin */
  rawLine: string;
  /** Detected line format */
  format: "handle" | "url" | "csv" | "pipe" | "name_only";
  /** Resolved name (may be null if only handle/URL provided) */
  name: string | null;
  /** Resolved IG handle (without @) */
  handle: string | null;
  /** City extracted from line */
  city: string | null;
  /** State extracted from line */
  state: string | null;
  /** Education type inferred from line content */
  educationType: EducationType | null;
  /** Audience type inferred from line content */
  audienceType: AudienceType | null;
  /** Category / topic string */
  category: string | null;
  /** Any parse warnings */
  warnings: string[];
}

// ─── Run config ───────────────────────────────────────────────────────────────

export interface EducationSeedRunConfig {
  /** Raw textarea text */
  inputText: string;
  /** Resolve mode */
  mode: "fast" | "deep";
  /** Max candidates per seed (default 8) */
  maxCandidatesPerSeed?: number;
  /** Default education type if not inferred */
  defaultEducationType?: EducationType;
  /** Default audience type if not inferred */
  defaultAudienceType?: AudienceType;
  /** If true, parse and validate only — do not upsert */
  dryRun?: boolean;
}

// ─── API shapes ───────────────────────────────────────────────────────────────

export interface EducationSeedRunRequest {
  inputText: string;
  mode: "fast" | "deep";
  maxCandidatesPerSeed?: number;
  defaultEducationType?: EducationType;
  defaultAudienceType?: AudienceType;
  dryRun?: boolean;
}

export interface EducationSeedRunResponse {
  ok: true;
  runId: string;
  parsedCount: number;
  assemblerResult: IdentityAssemblerRunResult;
  processedAt: string;
}

export interface EducationSeedErrorResponse {
  ok: false;
  error: string;
  detail?: string;
}
