// lib/studios/identity-seeds/reporting.ts
// Breakdown helpers for Identity Assembler run results.
// Used by admin pages to render pipeline summary tables and charts.

import type { IdentityAssemblerResult, IdentityAssemblerRunResult } from "./types";

// ─── Generic breakdown helpers ────────────────────────────────────────────────

export interface BreakdownEntry {
  label: string;
  count: number;
  saved: number;
  igFound: number;
}

function buildBreakdown(
  results: IdentityAssemblerResult[],
  keyFn: (r: IdentityAssemblerResult) => string | null | undefined,
): BreakdownEntry[] {
  const map = new Map<string, BreakdownEntry>();

  for (const r of results) {
    const key = keyFn(r) ?? "Unknown";
    if (!map.has(key)) map.set(key, { label: key, count: 0, saved: 0, igFound: 0 });
    const entry = map.get(key)!;
    entry.count++;
    if (r.saved) entry.saved++;
    if (r.igHandleFound) entry.igFound++;
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

// ─── Breakdown by category ────────────────────────────────────────────────────

export function breakdownByCategory(run: IdentityAssemblerRunResult): BreakdownEntry[] {
  return buildBreakdown(run.results, (r) => r.seed.category ?? "Uncategorized");
}

// ─── Breakdown by subcategory ─────────────────────────────────────────────────

export function breakdownBySubcategory(run: IdentityAssemblerRunResult): BreakdownEntry[] {
  return buildBreakdown(run.results, (r) => r.seed.subcategory ?? r.seed.category ?? "Uncategorized");
}

// ─── Breakdown by city/state ──────────────────────────────────────────────────

export function breakdownByCity(run: IdentityAssemblerRunResult): BreakdownEntry[] {
  return buildBreakdown(run.results, (r) => {
    const parts = [r.seed.city, r.seed.state].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Unknown";
  });
}

// ─── Breakdown by source platform ────────────────────────────────────────────

export function breakdownByPlatform(run: IdentityAssemblerRunResult): BreakdownEntry[] {
  return buildBreakdown(run.results, (r) => r.seed.sourcePlatform);
}

// ─── Breakdown by assembler status ───────────────────────────────────────────

export interface StatusBreakdown {
  ig_verified: number;
  ig_candidate: number;
  unresolved: number;
  total: number;
}

export function breakdownByStatus(run: IdentityAssemblerRunResult): StatusBreakdown {
  const counts = { ig_verified: 0, ig_candidate: 0, unresolved: 0, total: run.results.length };
  for (const r of run.results) {
    if (r.status === "ig_verified")  counts.ig_verified++;
    else if (r.status === "ig_candidate") counts.ig_candidate++;
    else counts.unresolved++;
  }
  return counts;
}

// ─── Breakdown by confidence band ────────────────────────────────────────────

export interface ConfidenceBand {
  band: string;
  min: number;
  max: number;
  count: number;
  saved: number;
}

export function breakdownByConfidence(run: IdentityAssemblerRunResult): ConfidenceBand[] {
  const bands: ConfidenceBand[] = [
    { band: "High (≥75)",   min: 75,  max: 100, count: 0, saved: 0 },
    { band: "Good (55–74)", min: 55,  max: 74,  count: 0, saved: 0 },
    { band: "Low (20–54)",  min: 20,  max: 54,  count: 0, saved: 0 },
    { band: "None (<20)",   min: 0,   max: 19,  count: 0, saved: 0 },
  ];

  for (const r of run.results) {
    const conf = r.igConfidence;
    for (const band of bands) {
      if (conf >= band.min && conf <= band.max) {
        band.count++;
        if (r.saved) band.saved++;
        break;
      }
    }
  }

  return bands.filter((b) => b.count > 0);
}

// ─── Save result summary ──────────────────────────────────────────────────────

export interface SaveSummary {
  totalAttempted: number;
  saved: number;
  failed: number;
  igFound: number;
  saveRate: number;    // 0–100
  igRate: number;      // 0–100
}

export function buildSaveSummary(run: IdentityAssemblerRunResult): SaveSummary {
  const total = run.totalAttempted;
  return {
    totalAttempted: total,
    saved:          run.savedCount,
    failed:         run.failedToSaveCount,
    igFound:        run.totalIgFound,
    saveRate:       total > 0 ? Math.round((run.savedCount / total) * 100) : 0,
    igRate:         total > 0 ? Math.round((run.totalIgFound / total) * 100) : 0,
  };
}

// ─── Full report ──────────────────────────────────────────────────────────────

export interface AssemblerReport {
  summary: SaveSummary;
  byStatus: StatusBreakdown;
  byCategory: BreakdownEntry[];
  byCity: BreakdownEntry[];
  byConfidence: ConfidenceBand[];
  saveErrors: IdentityAssemblerRunResult["saveErrors"];
}

export function buildAssemblerReport(run: IdentityAssemblerRunResult): AssemblerReport {
  return {
    summary:      buildSaveSummary(run),
    byStatus:     breakdownByStatus(run),
    byCategory:   breakdownByCategory(run),
    byCity:       breakdownByCity(run),
    byConfidence: breakdownByConfidence(run),
    saveErrors:   run.saveErrors,
  };
}
