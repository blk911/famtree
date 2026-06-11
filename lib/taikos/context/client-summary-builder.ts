import { buildClientOpportunities } from "@/lib/vmb/client-opportunities";
import { extractClientPool } from "@/lib/vmb/operating-system/client-pool";
import type { AiosClientSummary } from "@/lib/taikos/types";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

/**
 * Derive client signals from real book analysis — no mock clients when analysis exists.
 */
export function buildClientSummaryFromAnalysis(
  analysis: VmbBookAnalysisResult | null | undefined,
): AiosClientSummary {
  if (!analysis) {
    return {
      totalClients: 0,
      activeClients: 0,
      overdueClients: 0,
      birthdaysThisWeek: 0,
      likelyReactivations: 0,
      highValueClients: 0,
    };
  }

  const built = buildClientOpportunities(analysis);
  const pool = extractClientPool(analysis);
  const uniqueNames = new Set(built.rows.map((r) => r.clientName.trim().toLowerCase()));
  const totalClients = Math.max(analysis.recordCount, uniqueNames.size, pool.length);

  const overdueClients = built.rows.filter(
    (r) => r.triggerType === "Reactivation" || r.triggerType === "Lapsed",
  ).length;

  const birthdaysThisWeek = built.rows.filter((r) => r.triggerType === "Birthday").length;

  const likelyReactivations = analysis.reactivationTargets.length;

  const highValueClients = built.rows.filter((r) => r.value >= 120 || r.potentialRevenue >= 120).length;

  const activeClients = pool.filter((p) => p.daysInactive === null || p.daysInactive < 60).length;

  return {
    totalClients,
    activeClients,
    overdueClients,
    birthdaysThisWeek,
    likelyReactivations,
    highValueClients,
  };
}
