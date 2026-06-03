// lib/intelligence/salon/provider-provenance/provenance-engine.ts

import { filterProspects } from "@/lib/studios/prospects/store";
import type { ProspectRecord } from "@/lib/studios/prospects/types";
import { isConfirmedSalonBookingProvider } from "../gg-booking-display";
import { listBusinessStacks } from "../business-stack/stack-store";
import type { SalonBusinessStack } from "../business-stack/types";
import { getBookingProviderLabel } from "../provider-detector";
import { isGgValidationConfirmed } from "../glossgenius-page-validator";
import type {
  ProviderAssignmentSource,
  ProviderProvenanceBadAssignment,
  ProviderProvenanceByProvider,
  ProviderProvenanceQuestions,
  ProviderProvenanceRecord,
  ProviderProvenanceReport,
  ProviderProvenanceSummary,
} from "./types";

const GENERATED_ASSIGNMENT_SOURCES = new Set<ProviderAssignmentSource>([
  "generated_candidate",
  "handle_guess",
  "display_name_guess",
]);

const DIRECT_EVIDENCE_SOURCES = new Set<ProviderAssignmentSource>([
  "styleseat_directory",
  "direct_url",
  "link_in_bio",
  "website_link",
  "website_html",
]);

const REJECTED_VALIDATION_STATUSES = new Set([
  "rejected_generic_homepage",
  "rejected_marketing_page",
  "rejected_redirect_home",
  "rejected_login_signup",
  "rejected_not_found",
  "generic_glossgenius_page",
  "redirect_home",
  "blocked",
]);

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function extractStyleSeatUrl(p: ProspectRecord): string | null {
  if (p.bestMatch?.url?.includes("styleseat.com")) return p.bestMatch.url;
  const fromMatched = p.allMatchedUrls?.find((u) => u.url?.includes("styleseat.com"));
  if (fromMatched) return fromMatched.url;
  if (p.bookingUrl?.includes("styleseat.com")) return p.bookingUrl;
  const fromTrail = (p.linkTrailUrlsScanned ?? []).find((u) => u.includes("styleseat.com"));
  if (fromTrail) return fromTrail;
  return null;
}

function stackProviderMatchesProspect(stack: SalonBusinessStack, provider: string): boolean {
  const bookingId = stack.primaryBookingProvider;
  if (!bookingId) return false;
  if (bookingId === provider) return true;
  if (provider === "square" && bookingId === "square_appointments") return true;
  return false;
}

function findConfirmedStackSignal(
  stack: SalonBusinessStack | null | undefined,
  provider: string,
): { url?: string; confidence?: number; evidence: string[] } | null {
  if (!stack?.signals?.length) return null;
  for (const sig of stack.signals) {
    if (sig.category !== "booking") continue;
    const pid = sig.providerId === "square_appointments" ? "square" : sig.providerId;
    if (pid !== provider && sig.providerId !== provider) continue;
    if (!sig.evidence.some((e) => e.includes("provider_validation:confirmed"))) continue;
    return {
      url: sig.url,
      confidence: sig.confidence,
      evidence: sig.evidence,
    };
  }
  return null;
}

function mapBookingSourceToAssignment(
  src?: string | null,
): ProviderAssignmentSource | null {
  if (!src) return null;
  if (src === "direct_url") return "direct_url";
  if (src === "link_in_bio" || src === "link_trail") return "link_in_bio";
  if (src === "website_crawl" || src === "website_link") return "website_link";
  if (src === "website_html") return "website_html";
  if (src === "handle_derived" || src === "handle_guess") return "handle_guess";
  if (src === "display_name_derived" || src === "display_guess") return "display_name_guess";
  if (src === "google_search" || src === "public_web") return "public_presence";
  return null;
}

function validationStatusLabel(p: ProspectRecord): string | undefined {
  const confirmed = p.providerDiscoveryDebug?.providerValidation?.confirmed;
  if (confirmed?.status) return confirmed.status;
  if (p.ggValidationStatus && p.ggValidationStatus !== "not_attempted") {
    return p.ggValidationStatus;
  }
  const last = p.providerDiscoveryDebug?.providerValidation?.validations?.at(-1);
  return last?.status;
}

function isValidationConfirmed(p: ProspectRecord): boolean {
  const pv = p.providerDiscoveryDebug?.providerValidation;
  if (pv?.confirmed?.confirmed) return true;
  if (p.bookingProvider === "glossgenius" && isGgValidationConfirmed(p.ggValidationStatus)) {
    return true;
  }
  return Boolean(pv?.validations?.some((v) => v.confirmed));
}

function isRejectedValidation(p: ProspectRecord): boolean {
  const vs = validationStatusLabel(p);
  if (vs && REJECTED_VALIDATION_STATUSES.has(vs)) return true;
  return Boolean(
    p.providerDiscoveryDebug?.providerValidation?.validations?.some((v) =>
      REJECTED_VALIDATION_STATUSES.has(v.status),
    ),
  );
}

function collectEvidence(p: ProspectRecord, stack?: SalonBusinessStack | null): string[] {
  const out: string[] = [];
  const dbg = p.providerDiscoveryDebug;
  if (p.bookingProviderEvidence?.length) out.push(...p.bookingProviderEvidence);
  if (p.bookingUrl) out.push(`bookingUrl: ${p.bookingUrl}`);
  if (p.bookingProviderSource) out.push(`bookingProviderSource: ${p.bookingProviderSource}`);
  if (dbg?.providerResolverReason) out.push(`resolver: ${dbg.providerResolverReason}`);
  if (dbg?.externalUrl) out.push(`externalUrl: ${dbg.externalUrl}`);
  for (const u of dbg?.directUrlsScanned ?? []) out.push(`direct: ${u}`);
  for (const u of dbg?.linkTrailUrlsScanned ?? []) out.push(`trail: ${u}`);
  for (const u of dbg?.urlsScanned ?? []) out.push(`scanned: ${u}`);
  if (p.runId) out.push(`runId: ${p.runId}`);
  if (p.sourceTool) out.push(`sourceTool: ${p.sourceTool}`);
  const stackSig = findConfirmedStackSignal(stack ?? null, p.bookingProvider ?? "");
  if (stackSig?.evidence.length) out.push(...stackSig.evidence);
  return Array.from(new Set(out)).slice(0, 20);
}

function pickCandidateUrl(p: ProspectRecord): string | undefined {
  const pv = p.providerDiscoveryDebug?.providerValidation;
  const cand =
    pv?.confirmed?.candidateUrl ??
    pv?.candidates?.[0]?.candidateUrl ??
    p.bookingUrl ??
    p.bestMatch?.url ??
    undefined;
  return cand?.startsWith("http") ? cand : undefined;
}

function pickValidatedUrl(p: ProspectRecord): string | undefined {
  const pv = p.providerDiscoveryDebug?.providerValidation?.confirmed;
  const url = pv?.finalUrl ?? pv?.candidateUrl ?? p.ggValidatedUrl ?? p.bookingUrl;
  return url?.startsWith("http") ? url : undefined;
}

/** Build provenance for one prospect with a stored booking provider assignment. */
export function buildProviderProvenanceForProspect(
  prospect: ProspectRecord,
  stack?: SalonBusinessStack | null,
): ProviderProvenanceRecord | null {
  const provider = prospect.bookingProvider;
  if (!provider || provider === "unknown") return null;

  const now = new Date().toISOString();
  const handle = prospect.identity.handle.replace(/^@+/, "");
  const providerLabel =
    prospect.bookingProviderLabel ?? getBookingProviderLabel(provider as never) ?? provider;

  const pv = prospect.providerDiscoveryDebug?.providerValidation;
  const validationConfirmed = isValidationConfirmed(prospect);
  const stackConfirmed = findConfirmedStackSignal(stack ?? null, provider);
  const styleseatUrl = extractStyleSeatUrl(prospect);
  const isStyleSeatHarvest =
    prospect.sourceTool === "styleseat_harvest" ||
    prospect.sourcePlatform === "styleseat_harvest" ||
    prospect.source?.sourceType === "styleseat_harvest";

  let assignmentSource: ProviderAssignmentSource = "unknown";
  let confirmed = false;
  let reason = "";
  const evidence = collectEvidence(prospect, stack);

  // Rule A — provider validation confirmed
  if (validationConfirmed && pv?.confirmed) {
    assignmentSource = "provider_validation";
    confirmed = true;
    reason = `Provider validation confirmed (${pv.confirmed.status}): ${pv.confirmed.reason || "validated booking page"}`;
    if (pv.confirmed.positiveMarkers?.length) {
      evidence.push(`markers: ${pv.confirmed.positiveMarkers.join(", ")}`);
    }
  }
  // Rule B — StyleSeat directory
  else if (isStyleSeatHarvest && styleseatUrl && provider === "styleseat") {
    assignmentSource = "styleseat_directory";
    confirmed = true;
    reason = "StyleSeat directory harvest — explicit styleseat.com URL from source scrape";
    evidence.push(`styleseatUrl: ${styleseatUrl}`);
  }
  // Rule C — business stack confirmed booking signal
  else if (stackConfirmed && stackProviderMatchesProspect(stack!, provider)) {
    assignmentSource = "business_stack";
    confirmed = true;
    reason = "Business stack booking signal with provider_validation:confirmed evidence";
    if (stackConfirmed.url) evidence.push(`stackUrl: ${stackConfirmed.url}`);
  }
  // Rule D — direct evidence paths
  else {
    const mapped = mapBookingSourceToAssignment(prospect.bookingProviderSource);
    if (mapped && DIRECT_EVIDENCE_SOURCES.has(mapped)) {
      assignmentSource = mapped;
      confirmed = validationConfirmed || Boolean(stackConfirmed);
      reason = confirmed
        ? `${mapped} evidence with validation or stack confirmation`
        : `${mapped} evidence detected — awaiting validation confirmation`;
    }
    // Rule E — generated / guess paths
    else if (
      prospect.bookingProviderSource === "handle_derived" ||
      prospect.bookingProviderSource === "display_name_derived"
    ) {
      assignmentSource =
        prospect.bookingProviderSource === "handle_derived"
          ? "handle_guess"
          : "display_name_guess";
      confirmed = validationConfirmed;
      reason = confirmed
        ? `${assignmentSource} path later confirmed by validation`
        : `Inferred from ${prospect.bookingProviderSource} — not validated`;
      const genUrl = pickCandidateUrl(prospect);
      if (genUrl?.includes("styleseat.com/m/")) {
        assignmentSource = "generated_candidate";
        evidence.push(`generatedProbe: ${genUrl}`);
      }
    } else if (
      (prospect.candidateUrlsTested ?? []).some(
        (u) => typeof u === "string" && u.includes(provider),
      ) ||
      (prospect.rejectedCandidateUrls ?? []).length > 0
    ) {
      assignmentSource = "generated_candidate";
      confirmed = validationConfirmed;
      reason = confirmed
        ? "Generated candidate URL validated"
        : "Generated candidate probe — confirmation required";
    } else if (
      prospect.providerResolverReason?.includes("public_presence") ||
      prospect.bookingProviderSource === "google_search" ||
      prospect.bookingProviderSource === "public_web"
    ) {
      assignmentSource = "public_presence";
      confirmed = validationConfirmed;
      reason = "Public presence discovery path";
    }
    // Rule F — unknown
    else {
      assignmentSource = "unknown";
      confirmed = false;
      reason = "Provider assignment exists without confirmed provenance.";
    }
  }

  if (isRejectedValidation(prospect)) {
    confirmed = false;
    reason = `Validation rejected: ${validationStatusLabel(prospect) ?? "rejected"}`;
  }

  const confRaw =
    pv?.confirmed?.confidence ??
    prospect.bookingProviderConfidence ??
    stackConfirmed?.confidence;
  const confidence =
    confRaw != null ? (confRaw <= 1 ? Math.round(confRaw * 100) : Math.round(confRaw)) : undefined;

  return {
    id: `${prospect.prospectId}:${provider}`,
    prospectId: prospect.prospectId,
    instagramHandle: handle,
    displayName: prospect.identity.name,
    provider,
    providerLabel,
    assignmentSource,
    validationStatus: validationStatusLabel(prospect),
    confirmed,
    confidence,
    candidateUrl: pickCandidateUrl(prospect),
    validatedUrl: pickValidatedUrl(prospect),
    reason,
    evidence,
    createdAt: prospect.createdAt ?? now,
    updatedAt: prospect.updatedAt ?? now,
  };
}

export function classifyBadAssignment(record: ProviderProvenanceRecord): string[] {
  const flags: string[] = [];
  if (record.confirmed) return flags;

  if (!record.validationStatus || record.validationStatus === "not_attempted") {
    flags.push("validation_missing");
  }
  if (GENERATED_ASSIGNMENT_SOURCES.has(record.assignmentSource)) {
    flags.push("generated_unconfirmed");
  }
  if (
    record.validationStatus &&
    REJECTED_VALIDATION_STATUSES.has(record.validationStatus)
  ) {
    flags.push("generic_or_rejected");
  }
  if (!record.reason.trim()) flags.push("empty_reason");
  if (record.evidence.length === 0) flags.push("empty_evidence");
  if (record.assignmentSource === "unknown") flags.push("unknown_source");

  if (flags.length === 0) flags.push("unconfirmed_assignment");
  return flags;
}

export function isBadProvenanceRecord(record: ProviderProvenanceRecord): boolean {
  return classifyBadAssignment(record).length > 0;
}

/** Assignment has an auditable why/URL trail (not only a raw bookingProvider field). */
export function recordHasExplainableProvenance(record: ProviderProvenanceRecord): boolean {
  if (record.confirmed) return true;
  if (record.assignmentSource === "unknown") return false;
  const hasUrl = Boolean(record.candidateUrl?.startsWith("http") || record.validatedUrl?.startsWith("http"));
  return hasUrl && record.evidence.length > 0 && record.reason.trim().length > 0;
}

function countDisplayGateMetrics(
  records: ProviderProvenanceRecord[],
  prospects: ProspectRecord[],
): Pick<
  ProviderProvenanceSummary,
  | "storedAssignments"
  | "displayEligibleAssignments"
  | "hiddenUnconfirmedAssignments"
  | "assignmentsWithProvenance"
  | "assignmentsWithoutProvenance"
  | "provenanceCoveragePercent"
> {
  const storedAssignments = records.length;
  const assignmentsWithProvenance = records.filter(recordHasExplainableProvenance).length;
  const assignmentsWithoutProvenance = storedAssignments - assignmentsWithProvenance;
  const provenanceCoveragePercent =
    storedAssignments > 0
      ? Math.round((assignmentsWithProvenance / storedAssignments) * 100)
      : 0;

  const prospectById = new Map(prospects.map((p) => [p.prospectId, p]));
  let displayEligibleAssignments = 0;
  for (const rec of records) {
    const p = prospectById.get(rec.prospectId);
    if (p && isConfirmedSalonBookingProvider(p)) displayEligibleAssignments++;
  }
  const hiddenUnconfirmedAssignments = storedAssignments - displayEligibleAssignments;

  return {
    storedAssignments,
    displayEligibleAssignments,
    hiddenUnconfirmedAssignments,
    assignmentsWithProvenance,
    assignmentsWithoutProvenance,
    provenanceCoveragePercent,
  };
}

function toBadRow(record: ProviderProvenanceRecord): ProviderProvenanceBadAssignment {
  return {
    prospectId: record.prospectId,
    instagramHandle: record.instagramHandle ?? "",
    displayName: record.displayName ?? "",
    provider: record.provider,
    providerLabel: record.providerLabel,
    assignmentSource: record.assignmentSource,
    validationStatus: record.validationStatus,
    confirmed: record.confirmed,
    candidateUrl: record.candidateUrl,
    validatedUrl: record.validatedUrl,
    reason: record.reason,
    flags: classifyBadAssignment(record),
  };
}

function trustScoreForProvider(row: Omit<ProviderProvenanceByProvider, "trustScore">): number {
  if (row.total === 0) return 0;
  return clamp(
    Math.round((row.confirmed / row.total) * 100) -
      row.generated * 5 -
      row.unknown * 10 -
      row.rejected * 10,
  );
}

function buildSummary(
  records: ProviderProvenanceRecord[],
  prospects: ProspectRecord[],
): ProviderProvenanceSummary {
  const byProviderMap = new Map<string, ProviderProvenanceByProvider>();

  let confirmedAssignments = 0;
  let generatedAssignments = 0;
  let rejectedAssignments = 0;
  let unknownAssignments = 0;

  for (const r of records) {
    if (r.confirmed) confirmedAssignments++;
    if (GENERATED_ASSIGNMENT_SOURCES.has(r.assignmentSource)) generatedAssignments++;
    if (
      r.validationStatus &&
      REJECTED_VALIDATION_STATUSES.has(r.validationStatus)
    ) {
      rejectedAssignments++;
    }
    if (r.assignmentSource === "unknown") unknownAssignments++;

    let row = byProviderMap.get(r.provider);
    if (!row) {
      row = {
        provider: r.provider,
        providerLabel: r.providerLabel,
        total: 0,
        confirmed: 0,
        generated: 0,
        rejected: 0,
        unknown: 0,
        trustScore: 0,
      };
      byProviderMap.set(r.provider, row);
    }
    row.total++;
    if (r.confirmed) row.confirmed++;
    if (GENERATED_ASSIGNMENT_SOURCES.has(r.assignmentSource)) row.generated++;
    if (
      r.validationStatus &&
      REJECTED_VALIDATION_STATUSES.has(r.validationStatus)
    ) {
      row.rejected++;
    }
    if (r.assignmentSource === "unknown" || (!r.confirmed && !r.validationStatus)) {
      row.unknown++;
    }
  }

  const byProvider = Array.from(byProviderMap.values())
    .map((row) => ({ ...row, trustScore: trustScoreForProvider(row) }))
    .sort((a, b) => b.total - a.total);

  const badAssignments = records.filter(isBadProvenanceRecord).length;

  return {
    totalAssignments: records.length,
    confirmedAssignments,
    generatedAssignments,
    rejectedAssignments,
    unknownAssignments,
    badAssignments,
    byProvider,
    ...countDisplayGateMetrics(records, prospects),
  };
}

function buildQuestions(
  summary: ProviderProvenanceSummary,
  records: ProviderProvenanceRecord[],
): ProviderProvenanceQuestions {
  const directCount = records.filter((r) =>
    DIRECT_EVIDENCE_SOURCES.has(r.assignmentSource),
  ).length;
  const survivedValidation = records.filter((r) => r.confirmed).length;
  const withoutProof = records.filter((r) => !r.confirmed).length;

  const sorted = [...summary.byProvider].sort((a, b) => a.trustScore - b.trustScore);
  const weakest = sorted.find((r) => r.total > 0);
  const strongest = [...summary.byProvider].sort((a, b) => b.trustScore - a.trustScore).find(
    (r) => r.total > 0,
  );

  return {
    q1_total_assignments: `${summary.totalAssignments} salon prospects have a stored booking provider assignment (bookingProvider set).`,

    q2_confirmed_count: `${summary.confirmedAssignments} assignments (${summary.totalAssignments > 0 ? Math.round((summary.confirmedAssignments / summary.totalAssignments) * 100) : 0}%) are confirmed with validation, directory source, or stack evidence.`,

    q3_direct_evidence: `${directCount} assignments trace to direct evidence (directory scrape, direct URL, link-in-bio, or website link).`,

    q4_generated_candidates: `${summary.generatedAssignments} assignments came from generated candidates, handle guesses, or display-name guesses.`,

    q5_survived_validation: `${survivedValidation} assignments survived validation (confirmed=true). ${summary.rejectedAssignments} were rejected or generic.`,

    q6_without_proof: withoutProof > 0
      ? `Yes — ${withoutProof} assignments lack confirmed proof and appear in Bad Assignments (${summary.badAssignments} flagged rows).`
      : "No — every stored assignment has confirmed provenance.",

    q7_weakest_provider: weakest
      ? `Weakest: ${weakest.providerLabel} (trust ${weakest.trustScore}, ${weakest.confirmed}/${weakest.total} confirmed, ${weakest.generated} generated, ${weakest.unknown} unknown).`
      : "No provider assignments in store.",

    q8_strongest_provider: strongest
      ? `Strongest: ${strongest.providerLabel} (trust ${strongest.trustScore}, ${strongest.confirmed}/${strongest.total} confirmed).`
      : "No provider assignments in store.",

    q9_provenance_coverage_pct: `${summary.provenanceCoveragePercent}% of stored provider assignments (${summary.assignmentsWithProvenance} of ${summary.storedAssignments}) have explainable provenance — validation confirmed, directory URL, stack signal, or auditable URL/evidence trail. ${summary.assignmentsWithoutProvenance} lack explainable provenance.`,

    q10_hidden_stored_assignments: `${summary.hiddenUnconfirmedAssignments} stored provider assignments are hidden by the display gate (bookingProvider set on record but bookingProviderForDisplay / isConfirmedSalonBookingProvider suppresses the pill). ${summary.displayEligibleAssignments} are display-eligible.`,
  };
}

export async function buildSalonProviderProvenanceReport(options?: {
  useCache?: boolean;
  records?: ProviderProvenanceRecord[];
}): Promise<ProviderProvenanceReport> {
  let records = options?.records ?? null;
  let fromCache = false;

  if (!records && options?.useCache) {
    const { getProvenanceCache } = await import("./provenance-store");
    const cached = getProvenanceCache();
    if (cached.records?.length) {
      records = cached.records;
      fromCache = true;
    }
  }

  const prospects = await filterProspects({ vertical: "salon" });

  if (!records) {
    const stacks = await listBusinessStacks({ limit: 500 });
    const stackById = new Map(stacks.map((s) => [s.prospectId, s]));

    records = [];
    for (const p of prospects) {
      const stack = stackById.get(p.prospectId) ?? null;
      const rec = buildProviderProvenanceForProspect(p, stack);
      if (rec) records.push(rec);
    }
    records.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  }

  const summary = buildSummary(records, prospects);
  const badAssignments = records.filter(isBadProvenanceRecord).map(toBadRow);
  const questions = buildQuestions(summary, records);

  return {
    ok: true,
    summary,
    records,
    badAssignments,
    questions,
    computedAt: new Date().toISOString(),
    fromCache,
  };
}

export async function runProviderProvenanceBackfill(options?: {
  limit?: number;
  persist?: boolean;
}): Promise<{
  ok: true;
  checked: number;
  recordsBuilt: number;
  confirmed: number;
  generated: number;
  rejected: number;
  unknown: number;
  badAssignments: number;
}> {
  const limit = options?.limit ?? 500;
  const prospects = (await filterProspects({ vertical: "salon" })).slice(0, limit);
  const stacks = await listBusinessStacks({ limit });
  const stackById = new Map(stacks.map((s) => [s.prospectId, s]));

  const records: ProviderProvenanceRecord[] = [];
  for (const p of prospects) {
    const rec = buildProviderProvenanceForProspect(p, stackById.get(p.prospectId) ?? null);
    if (rec) records.push(rec);
  }

  if (options?.persist !== false) {
    const { persistProvenanceCache } = await import("./provenance-store");
    await persistProvenanceCache(records);
  }

  const allProspects = await filterProspects({ vertical: "salon" });
  const summary = buildSummary(records, allProspects);
  return {
    ok: true,
    checked: prospects.length,
    recordsBuilt: records.length,
    confirmed: summary.confirmedAssignments,
    generated: summary.generatedAssignments,
    rejected: summary.rejectedAssignments,
    unknown: summary.unknownAssignments,
    badAssignments: summary.badAssignments,
  };
}
