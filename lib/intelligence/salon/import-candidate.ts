// lib/intelligence/salon/import-candidate.ts
// Back-office import candidate heuristics for salon prospects.

import type { ProspectRecord } from "@/lib/studios/prospects/types";
import { isBackOfficeImportCandidate } from "./provider-detector";

const IMPORT_PROVIDERS = new Set([
  "glossgenius",
  "vagaro",
  "square",
  "booksy",
  "fresha",
  "styleseat",
  "schedulicity",
  "acuity",
  "mangomint",
]);

const DEFAULT_CONFIDENCE_THRESHOLD = 55;

export function isSalonImportCandidate(
  prospect: ProspectRecord,
  options?: { minConfidence?: number },
): boolean {
  const minConf = options?.minConfidence ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const tags = prospect.offerFitTags ?? [];
  if (tags.includes("backoffice_import_candidate")) return true;
  if (isBackOfficeImportCandidate(prospect.bookingProvider)) return true;
  const provider = (prospect.bookingProvider ?? "").toLowerCase();
  if (IMPORT_PROVIDERS.has(provider) && (prospect.bookingProviderConfidence ?? 0) >= minConf) {
    return true;
  }
  return false;
}

export function importCandidateProviderPriority(provider?: string | null): number {
  const p = (provider ?? "").toLowerCase();
  if (p === "glossgenius") return 0;
  if (p === "vagaro") return 1;
  if (IMPORT_PROVIDERS.has(p)) return 2;
  return 9;
}

export function compareImportCandidates(a: ProspectRecord, b: ProspectRecord): number {
  const pa = importCandidateProviderPriority(a.bookingProvider);
  const pb = importCandidateProviderPriority(b.bookingProvider);
  if (pa !== pb) return pa - pb;
  const ca = a.bookingProviderConfidence ?? 0;
  const cb = b.bookingProviderConfidence ?? 0;
  if (ca !== cb) return cb - ca;
  const oa = a.overallOpportunityScore ?? 0;
  const ob = b.overallOpportunityScore ?? 0;
  return ob - oa;
}

export type ConfidenceBucket = "all" | "high" | "medium" | "low";

export function matchesConfidenceBucket(
  confidence: number | undefined,
  bucket: ConfidenceBucket,
): boolean {
  if (bucket === "all") return true;
  const c = confidence ?? 0;
  if (bucket === "high") return c >= 75;
  if (bucket === "medium") return c >= 50 && c < 75;
  return c < 50;
}
