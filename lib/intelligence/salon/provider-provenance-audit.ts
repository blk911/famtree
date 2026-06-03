// lib/intelligence/salon/provider-provenance-audit.ts
// Legacy coverage metrics — delegates to provider-provenance engine for Provider Audit tabs.

import { filterProspects } from "@/lib/studios/prospects/store";
import {
  buildSalonProviderProvenanceReport,
  buildProviderProvenanceForProspect,
  classifyBadAssignment,
  isBadProvenanceRecord,
} from "./provider-provenance/provenance-engine";
import { isConfirmedSalonBookingProvider, bookingProviderForDisplay } from "./gg-booking-display";
import type { ProspectRecord } from "@/lib/studios/prospects/types";
import type { SalonBusinessStack } from "./business-stack/types";

export type ProvenanceCoverageMetrics = {
  totalAssignments: number;
  withExplainableProvenance: number;
  withoutProvenance: number;
  coveragePercent: number;
};

export type HiddenVsDisplayedMetrics = {
  storedAssignments: number;
  displayEligibleAssignments: number;
  hiddenUnconfirmedAssignments: number;
  hiddenPercent: number;
};

export type ProviderTrustRow = {
  providerId: string;
  label: string;
  storedCount: number;
  displayEligibleCount: number;
  hiddenCount: number;
  withProvenanceCount: number;
  withoutProvenanceCount: number;
  badAssignmentCount: number;
  coveragePercent: number;
  trustScore: number;
};

export type BadAssignmentReason =
  | "hidden_unconfirmed"
  | "no_provenance"
  | "generated_unvalidated"
  | "missing_booking_url"
  | "high_confidence_unconfirmed";

export type BadAssignmentRecord = {
  prospectId: string;
  instagramHandle: string;
  displayName: string;
  bookingProvider: string;
  bookingProviderLabel: string | null;
  bookingUrl: string | null;
  bookingProviderSource: string | null;
  bookingProviderConfidence: number | null;
  reasons: BadAssignmentReason[];
  hasExplainableProvenance: boolean;
  displayEligible: boolean;
};

export type ProviderProvenanceAnswers = {
  q9_provenance_coverage_pct: string;
  q10_hidden_stored_assignments: string;
};

export type ProviderProvenanceAuditReport = {
  ok: true;
  salonProspectCount: number;
  provenanceCoverage: ProvenanceCoverageMetrics;
  hiddenVsDisplayed: HiddenVsDisplayedMetrics;
  providerTrustTable: ProviderTrustRow[];
  badAssignments: BadAssignmentRecord[];
  answers: ProviderProvenanceAnswers;
};

export async function buildProviderProvenanceAuditReport(): Promise<ProviderProvenanceAuditReport> {
  const report = await buildSalonProviderProvenanceReport({ useCache: true });
  const { summary, records, badAssignments: badRows } = report;

  const provenanceCoverage: ProvenanceCoverageMetrics = {
    totalAssignments: summary.totalAssignments,
    withExplainableProvenance: summary.confirmedAssignments,
    withoutProvenance: summary.totalAssignments - summary.confirmedAssignments,
    coveragePercent:
      summary.totalAssignments > 0
        ? Math.round((summary.confirmedAssignments / summary.totalAssignments) * 100)
        : 0,
  };

  const prospects = await filterProspects({ vertical: "salon" });
  let displayEligibleAssignments = 0;
  let hiddenUnconfirmedAssignments = 0;
  for (const p of prospects) {
    if (!p.bookingProvider || p.bookingProvider === "unknown") continue;
    if (isConfirmedSalonBookingProvider(p)) displayEligibleAssignments++;
    else hiddenUnconfirmedAssignments++;
  }

  const providerTrustTable: ProviderTrustRow[] = summary.byProvider.map((row) => {
    const providerRecords = records.filter((r) => r.provider === row.provider);
    let display = 0;
    let hidden = 0;
    for (const rec of providerRecords) {
      const p = prospects.find((x) => x.prospectId === rec.prospectId);
      if (p && isConfirmedSalonBookingProvider(p)) display++;
      else hidden++;
    }
    return {
      providerId: row.provider,
      label: row.providerLabel,
      storedCount: row.total,
      displayEligibleCount: display,
      hiddenCount: hidden,
      withProvenanceCount: row.confirmed,
      withoutProvenanceCount: row.total - row.confirmed,
      badAssignmentCount: providerRecords.filter(isBadProvenanceRecord).length,
      coveragePercent: row.total > 0 ? Math.round((row.confirmed / row.total) * 100) : 0,
      trustScore: row.trustScore,
    };
  });

  const hiddenVsDisplayed: HiddenVsDisplayedMetrics = {
    storedAssignments: summary.totalAssignments,
    displayEligibleAssignments,
    hiddenUnconfirmedAssignments,
    hiddenPercent:
      summary.totalAssignments > 0
        ? Math.round((hiddenUnconfirmedAssignments / summary.totalAssignments) * 100)
        : 0,
  };

  const badAssignments: BadAssignmentRecord[] = badRows.map((b) => ({
    prospectId: b.prospectId,
    instagramHandle: b.instagramHandle,
    displayName: b.displayName,
    bookingProvider: b.provider,
    bookingProviderLabel: b.providerLabel,
    bookingUrl: b.candidateUrl ?? null,
    bookingProviderSource: null,
    bookingProviderConfidence: null,
    reasons: mapFlagsToReasons(b.flags),
    hasExplainableProvenance: b.confirmed,
    displayEligible: b.confirmed,
  }));

  return {
    ok: true,
    salonProspectCount: records.length,
    provenanceCoverage,
    hiddenVsDisplayed,
    providerTrustTable,
    badAssignments,
    answers: {
      q9_provenance_coverage_pct: `${provenanceCoverage.coveragePercent}% of stored assignments have explainable provenance.`,
      q10_hidden_stored_assignments: `${hiddenUnconfirmedAssignments} stored assignments are hidden by the display gate.`,
    },
  };
}

function mapFlagsToReasons(flags: string[]): BadAssignmentReason[] {
  const out: BadAssignmentReason[] = [];
  for (const f of flags) {
    if (f === "validation_missing" || f === "unknown_source") out.push("no_provenance");
    if (f === "generated_unconfirmed") out.push("generated_unvalidated");
    if (f === "unconfirmed_assignment") out.push("hidden_unconfirmed");
    if (f === "empty_evidence") out.push("no_provenance");
    if (f === "generic_or_rejected") out.push("generated_unvalidated");
  }
  return Array.from(new Set(out));
}

export function prospectProvenanceSnapshot(
  p: ProspectRecord,
  stack?: SalonBusinessStack | null,
) {
  const record = buildProviderProvenanceForProspect(p, stack);
  const stored = Boolean(p.bookingProvider && p.bookingProvider !== "unknown");
  const display = isConfirmedSalonBookingProvider(p);
  const displayFields = bookingProviderForDisplay(p);
  return {
    storedAssignment: stored,
    displayEligibleAssignment: display,
    hiddenAssignment: stored && !display,
    hasExplainableProvenance: record?.confirmed ?? false,
    displayedProvider: displayFields.bookingProvider ?? null,
    storedProvider: p.bookingProvider ?? null,
    badReasons: mapFlagsToReasons(record ? classifyLegacyBad(record) : []),
    record,
  };
}

function classifyLegacyBad(
  record: NonNullable<ReturnType<typeof buildProviderProvenanceForProspect>>,
): string[] {
  return classifyBadAssignment(record);
}
