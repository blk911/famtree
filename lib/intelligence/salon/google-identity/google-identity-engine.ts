// lib/intelligence/salon/google-identity/google-identity-engine.ts

import { filterProspects } from "@/lib/studios/prospects/store";
import type { ProspectRecord } from "@/lib/studios/prospects/types";
import { getBookingProviderLabel, type SalonBookingProvider } from "../provider-detector";

const KNOWN_PROVIDERS = new Set<string>([
  "glossgenius",
  "styleseat",
  "vagaro",
  "square",
  "booksy",
  "fresha",
  "unknown",
]);

function providerLabelFor(p: ProspectRecord): string {
  if (p.bookingProviderLabel) return p.bookingProviderLabel;
  const id = p.bookingProvider ?? "unknown";
  if (KNOWN_PROVIDERS.has(id)) {
    return getBookingProviderLabel(id as SalonBookingProvider);
  }
  return id;
}
import { matchGoogleIdentityForProspect } from "./google-match-engine";
import {
  getGoogleIdentityCache,
  getGoogleIdentityForProspect,
  loadGoogleIdentityCacheFromDisk,
  persistGoogleIdentityCache,
} from "./google-identity-store";
import { getGoogleIdentityConnectionDiagnostics } from "./google-identity-connection";
import { prospectToGoogleIdentityInput } from "./prospect-input";
import type {
  GoogleIdentityByProvider,
  GoogleIdentityConflictRow,
  GoogleIdentityQuestions,
  GoogleIdentityRecord,
  GoogleIdentityReport,
  GoogleIdentitySummary,
} from "./types";

function buildSummary(
  records: GoogleIdentityRecord[],
  totalProspects: number,
): GoogleIdentitySummary {
  const confirmed = records.filter((r) => r.status === "confirmed").length;
  const probable = records.filter((r) => r.status === "probable").length;
  const possible = records.filter((r) => r.status === "possible").length;
  const conflict = records.filter((r) => r.status === "conflict").length;
  const notFound = records.filter((r) => r.status === "not_found").length;
  const withMatch = records.filter((r) => r.status !== "not_found").length;
  const coveragePercent =
    totalProspects > 0 ? Math.round((withMatch / totalProspects) * 100) : 0;

  return {
    totalProspects,
    confirmed,
    probable,
    possible,
    conflict,
    notFound,
    coveragePercent,
  };
}

function buildConflictRows(
  records: GoogleIdentityRecord[],
  prospectById: Map<string, ProspectRecord>,
): GoogleIdentityConflictRow[] {
  const rows: GoogleIdentityConflictRow[] = [];
  for (const rec of records) {
    if (rec.status !== "conflict") continue;
    const p = prospectById.get(rec.prospectId);
    const input = p ? prospectToGoogleIdentityInput(p) : undefined;
    const issues =
      rec.evidence.filter((e) => e.includes("mismatch") || e.includes("Multiple")) ||
      rec.evidence;
    rows.push({
      prospectId: rec.prospectId,
      displayName: p?.identity.name,
      instagramHandle: p?.identity.handle,
      status: rec.status,
      issues: issues.length ? issues : [rec.matchReason],
      googleWebsite: rec.googleWebsite,
      prospectWebsite: input?.website,
    });
  }
  return rows;
}

function buildByProvider(
  records: GoogleIdentityRecord[],
  prospects: ProspectRecord[],
): GoogleIdentityByProvider[] {
  const byId = new Map(records.map((r) => [r.prospectId, r]));
  const buckets = new Map<string, GoogleIdentityByProvider>();

  for (const p of prospects) {
    const provider = p.bookingProvider ?? "unknown";
    const label = providerLabelFor(p);
    let bucket = buckets.get(provider);
    if (!bucket) {
      bucket = {
        provider,
        providerLabel: label,
        total: 0,
        withGoogleMatch: 0,
        confirmed: 0,
        coveragePercent: 0,
      };
      buckets.set(provider, bucket);
    }
    bucket.total += 1;
    const rec = byId.get(p.prospectId);
    if (rec && rec.status !== "not_found") bucket.withGoogleMatch += 1;
    if (rec?.status === "confirmed") bucket.confirmed += 1;
  }

  const list = Array.from(buckets.values());
  for (const b of list) {
    b.coveragePercent = b.total > 0 ? Math.round((b.withGoogleMatch / b.total) * 100) : 0;
  }
  list.sort((a, b) => b.coveragePercent - a.coveragePercent);
  return list;
}

function needsManualReview(rec: GoogleIdentityRecord): boolean {
  if (rec.status === "conflict") return true;
  if (rec.status === "possible" && rec.matchConfidence < 65) return true;
  if (rec.status === "not_found" && rec.evidence.some((e) => e.includes("not connected"))) {
    return false;
  }
  if (rec.status === "probable" && rec.permanentlyClosed) return true;
  return rec.status === "not_found";
}

function buildQuestions(
  summary: GoogleIdentitySummary,
  records: GoogleIdentityRecord[],
  byProvider: GoogleIdentityByProvider[],
  manualReview: GoogleIdentityRecord[],
): GoogleIdentityQuestions {
  const matched = records.filter((r) => r.status !== "not_found").length;
  const strongest = byProvider[0];
  const weakest = byProvider.length ? byProvider[byProvider.length - 1] : undefined;

  return {
    q1_matched_google: `${matched} of ${summary.totalProspects} salon prospects have a Google Business reference match (any status above not_found).`,
    q2_confirmed: `${summary.confirmed} prospects are confirmed (≥95% match confidence, no conflicts).`,
    q3_probable: `${summary.probable} prospects are probable (≥80% confidence).`,
    q4_possible: `${summary.possible} prospects are possible (≥60% confidence).`,
    q5_conflicts: `${summary.conflict} prospects have identity conflicts between prospect signals and Google.`,
    q6_not_found: `${summary.notFound} prospects have no Google Business match in the audit cache.`,
    q7_strongest_provider_coverage: strongest
      ? `Strongest Google coverage by booking provider: ${strongest.providerLabel} (${strongest.coveragePercent}% of ${strongest.total} prospects with a Google match).`
      : "No booking provider breakdown available.",
    q8_weakest_provider_coverage: weakest
      ? `Weakest Google coverage by booking provider: ${weakest.providerLabel} (${weakest.coveragePercent}% of ${weakest.total} prospects with a Google match).`
      : "No booking provider breakdown available.",
    q9_coverage_percent: `${summary.coveragePercent}% of salon prospects have Google identity coverage in the audit layer.`,
    q10_manual_review: `${manualReview.length} prospects need manual review (conflicts, weak possible matches, closed listings, or not_found with active booking signals). IDs: ${manualReview
      .slice(0, 12)
      .map((r) => r.prospectId)
      .join(", ")}${manualReview.length > 12 ? "…" : ""}.`,
  };
}

export async function buildSalonGoogleIdentityReport(options?: {
  useCache?: boolean;
  records?: GoogleIdentityRecord[];
}): Promise<GoogleIdentityReport> {
  let records = options?.records ?? null;
  let fromCache = false;

  if (!records && options?.useCache !== false) {
    await loadGoogleIdentityCacheFromDisk();
    const cached = getGoogleIdentityCache();
    if (cached.records?.length) {
      records = cached.records;
      fromCache = true;
    }
  }

  const prospects = await filterProspects({ vertical: "salon" });
  const prospectById = new Map(prospects.map((p) => [p.prospectId, p]));

  if (!records) {
    records = [];
  }

  const summary = buildSummary(records, prospects.length);
  const conflicts = buildConflictRows(records, prospectById);
  const byProvider = buildByProvider(records, prospects);
  const manualReview = records.filter(needsManualReview);
  const questions = buildQuestions(summary, records, byProvider, manualReview);

  const connection = getGoogleIdentityConnectionDiagnostics();

  return {
    ok: true,
    summary,
    records,
    conflicts,
    questions,
    byProvider,
    computedAt: new Date().toISOString(),
    fromCache,
    providerConnected: connection.providerConnected,
    connection,
  };
}

export async function runGoogleIdentityBackfill(options?: {
  limit?: number;
  persist?: boolean;
}): Promise<{
  ok: true;
  checked: number;
  confirmed: number;
  probable: number;
  possible: number;
  conflicts: number;
  notFound: number;
  connection: ReturnType<typeof getGoogleIdentityConnectionDiagnostics>;
}> {
  const limit = options?.limit ?? 500;
  const prospects = (await filterProspects({ vertical: "salon" })).slice(0, limit);
  const records: GoogleIdentityRecord[] = [];

  for (const p of prospects) {
    const input = prospectToGoogleIdentityInput(p);
    const rec = await matchGoogleIdentityForProspect(input);
    records.push(rec);
  }

  if (options?.persist !== false) {
    await persistGoogleIdentityCache(records);
  }

  const summary = buildSummary(records, prospects.length);
  const connection = getGoogleIdentityConnectionDiagnostics();
  return {
    ok: true,
    checked: prospects.length,
    confirmed: summary.confirmed,
    probable: summary.probable,
    possible: summary.possible,
    conflicts: summary.conflict,
    notFound: summary.notFound,
    connection,
  };
}

export async function getGoogleIdentityRecordForProspect(
  prospect: ProspectRecord,
): Promise<GoogleIdentityRecord | null> {
  await loadGoogleIdentityCacheFromDisk();
  return getGoogleIdentityForProspect(prospect.prospectId);
}
