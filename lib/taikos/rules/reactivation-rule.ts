import type { AiosRuleResult } from "@/lib/taikos/types";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

export function runReactivationRule(analysis: VmbBookAnalysisResult | undefined): AiosRuleResult | null {
  if (!analysis) return null;
  const targets = analysis.reactivationTargets ?? [];
  if (targets.length === 0) return null;

  const value = targets.reduce((sum, t) => sum + t.estimatedValue, 0);
  const top = [...targets].sort((a, b) => b.estimatedValue - a.estimatedValue)[0];

  return {
    ruleId: "reactivation",
    severity: "notice",
    value,
    recommendation: `${targets.length} clients are overdue for a visit. Start with ${top.clientName}.`,
    actions: [
      {
        id: "reactivation-clients",
        label: "View overdue clients",
        kind: "open_clients",
        href: "/vmb/clients",
      },
      {
        id: "reactivation-invites",
        label: "Draft reactivation messages",
        kind: "open_invites",
        href: "/vmb/invites?section=revenue_touch",
      },
    ],
    opportunity: {
      id: "reactivation-batch",
      title: "Reactivation moves",
      description: `${targets.length} likely reactivations from your book.`,
      estimatedValue: value,
      severity: "notice",
      sourceRule: "reactivation",
    },
  };
}
