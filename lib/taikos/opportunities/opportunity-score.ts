import type { TaikosOpportunityPriority } from "./types";

export function scoreOpportunity(
  estimatedValue: number,
  confidence: number,
  hasRealBookData: boolean,
): { score: number; priority: TaikosOpportunityPriority } {
  const dataBoost = hasRealBookData ? 1 : 0.6;
  const score = Math.round(estimatedValue * (confidence / 100) * dataBoost);

  let priority: TaikosOpportunityPriority = "Low";
  if (score >= 120 || confidence >= 80) priority = "High";
  else if (score >= 60 || confidence >= 55) priority = "Medium";

  return { score, priority };
}
