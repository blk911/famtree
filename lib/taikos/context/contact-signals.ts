import { buildClientOpportunities } from "@/lib/vmb/client-opportunities";
import type { AiosContactCandidate } from "@/lib/taikos/types";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

export type ContactSignals = {
  hasRealBookData: boolean;
  contactCandidates: AiosContactCandidate[];
  overdueClients: AiosContactCandidate[];
  saturdayCandidates: AiosContactCandidate[];
};

export function buildContactSignals(
  analysis: VmbBookAnalysisResult | null | undefined,
): ContactSignals {
  if (!analysis || analysis.recordCount === 0) {
    return {
      hasRealBookData: false,
      contactCandidates: [],
      overdueClients: [],
      saturdayCandidates: [],
    };
  }

  const built = buildClientOpportunities(analysis);
  const rows = [...built.rows].sort((a, b) => b.value - a.value);

  const contactCandidates: AiosContactCandidate[] = rows.slice(0, 6).map((row) => ({
    clientName: row.clientName,
    reason: row.trigger,
    estimatedValue: row.potentialRevenue || row.value,
  }));

  const overdueClients = rows
    .filter((r) => r.triggerType === "Reactivation" || r.triggerType === "Lapsed")
    .slice(0, 8)
    .map((row) => ({
      clientName: row.clientName,
      reason: row.triggerType === "Lapsed" ? "Lapsed client" : "Overdue for visit",
      estimatedValue: row.potentialRevenue || row.value,
    }));

  const saturdayCandidates = rows
    .filter(
      (r) =>
        r.triggerType === "Referral" ||
        r.triggerType === "Frequent Visitor" ||
        r.triggerType === "VIP",
    )
    .slice(0, 5)
    .map((row) => ({
      clientName: row.clientName,
      reason: "Likely to fill a Saturday opening",
      estimatedValue: row.potentialRevenue || row.value,
    }));

  return {
    hasRealBookData: true,
    contactCandidates,
    overdueClients,
    saturdayCandidates,
  };
}
