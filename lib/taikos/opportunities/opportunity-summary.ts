import type { TaikosOpportunity, TaikosOpportunitySummary } from "./types";

export function summarizeOpportunities(
  opportunities: TaikosOpportunity[],
  limit = 8,
): TaikosOpportunitySummary {
  const sorted = [...opportunities].sort((a, b) => b.score - a.score);
  const top = sorted[0] ?? null;
  return {
    totalOpportunities: sorted.length,
    highPriority: sorted.filter((o) => o.priority === "High").length,
    topOpportunity: top,
    opportunities: sorted.slice(0, limit),
  };
}
