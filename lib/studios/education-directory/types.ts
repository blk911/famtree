// lib/studios/education-directory/types.ts
// Types for the Education Directory Import pipeline.
// Parses pasted directory rows / URLs / text blocks → IdentitySeeds → Prospects.

import type { EducationType, AudienceType } from "@/lib/studios/creator-lab/hashtag-harvest/education-config";
import type { IdentityAssemblerRunResult } from "@/lib/studios/identity-seeds/types";

export type { EducationType, AudienceType };

// ─── Parsed directory entry ───────────────────────────────────────────────────

export type DirectoryLineFormat =
  | "pipe"        // Name | Location | Category | URL
  | "csv"         // Name, Location, Category, URL
  | "dash"        // Name - Location - Category
  | "handle"      // @handle
  | "url"         // https://...
  | "text_block"  // freeform paragraph/text
  | "name_only";

export interface ParsedDirectoryEntry {
  rawLine: string;
  format: DirectoryLineFormat;
  name: string | null;
  handle: string | null;     // IG handle (no @)
  city: string | null;
  state: string | null;
  category: string | null;
  subcategory: string | null;
  educationType: EducationType | null;
  audienceType: AudienceType | null;
  description: string | null;  // bio / description text
  websiteUrl: string | null;   // non-IG URL found in line
  igUrl: string | null;        // canonical IG URL if found
  socials: string[];           // all social/web links found
  sourceEvidence: string[];    // raw strings used as evidence
  warnings: string[];
}

// ─── Run file stored on disk ──────────────────────────────────────────────────

export interface DirectoryRunSummary {
  runId: string;
  createdAt: string;         // ISO-8601
  mode: "fast" | "deep";
  inputLineCount: number;
  parsedCount: number;
  savedCount: number;
  failedToSaveCount: number;
  totalIgFound: number;
  prospectsBeforeCount: number;
  prospectsAfterCount: number;
  storePath: string | null;
  prospectStoreBackend: string;
}

export interface DirectoryRunFile {
  summary: DirectoryRunSummary;
  entries: ParsedDirectoryEntry[];
  assemblerResult: IdentityAssemblerRunResult;
}

// ─── API shapes ───────────────────────────────────────────────────────────────

export interface DirectoryRunRequest {
  inputText: string;
  mode: "fast" | "deep";
  maxCandidatesPerSeed?: number;
  dryRun?: boolean;
}

export interface DirectoryRunResponse {
  ok: true;
  runId: string;
  parsedCount: number;
  assemblerResult: IdentityAssemblerRunResult;
  entries: ParsedDirectoryEntry[];
  processedAt: string;
  storePath: string | null;
  prospectStoreBackend: string;
  prospectsBeforeCount: number;
  prospectsAfterCount: number;
}

export interface DirectoryListResponse {
  ok: true;
  runs: DirectoryRunSummary[];
  total: number;
}

export interface DirectoryErrorResponse {
  ok: false;
  error: string;
  detail?: string;
}
