import { ACTION_REGISTRY } from "@/lib/taikos/actions/action-registry";
import type { TaikosOpportunity } from "@/lib/taikos/opportunities/types";

export function suggestedActionLabel(opportunity: TaikosOpportunity): string {
  return ACTION_REGISTRY[opportunity.suggestedAction]?.label ?? opportunity.suggestedAction;
}

export function reasonFromOpportunity(opportunity: TaikosOpportunity): string {
  return opportunity.recommendation;
}

/** Best-effort client label from recommendation copy or category. */
export function clientNameFromOpportunity(opportunity: TaikosOpportunity): string {
  const rec = opportunity.recommendation.trim();

  const singleMatch = rec.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+is\s+a\b/);
  if (singleMatch) return singleMatch[1];

  const pairMatch = rec.match(/^([A-Z][a-z]+)\s+and\s+([A-Z][a-z]+)\b/);
  if (pairMatch) return `${pairMatch[1]} & ${pairMatch[2]}`;

  switch (opportunity.category) {
    case "Referral":
      return "Referral candidate";
    case "Reactivation":
      return "Overdue client";
    case "Open Slot":
      return "Open calendar";
    case "PCN Invite":
      return "PCN prospects";
    case "Birthday":
      return "Birthday client";
    case "Retention":
      return "Loyal client";
    case "Revenue Gap":
      return "Revenue goal";
    default:
      return "Your clients";
  }
}
