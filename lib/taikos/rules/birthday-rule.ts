import type { AiosRuleResult } from "@/lib/taikos/types";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

export function runBirthdayRule(analysis: VmbBookAnalysisResult | undefined): AiosRuleResult | null {
  if (!analysis) return null;
  const gifts = analysis.giftOpportunities ?? [];
  const birthdays = gifts.filter((g) => /birthday/i.test(g.summary ?? g.suggestedAction ?? ""));
  if (birthdays.length === 0) return null;

  const value = birthdays.reduce((sum, g) => sum + g.estimatedValue, 0);
  const first = birthdays[0];

  return {
    ruleId: "birthday",
    severity: "priority",
    value,
    recommendation:
      birthdays.length === 1
        ? `${first.clientName} has a birthday coming up — send a welcome touch.`
        : `${birthdays.length} birthdays are coming up this week.`,
    actions: [
      {
        id: "birthday-invites",
        label: "Review birthday touches",
        kind: "open_invites",
        href: "/vmb/invites?section=revenue_touch",
      },
    ],
    opportunity: {
      id: "birthday-batch",
      title: "Birthday opportunities",
      description: `${birthdays.length} client${birthdays.length === 1 ? "" : "s"} with upcoming birthdays.`,
      estimatedValue: value,
      severity: "priority",
      sourceRule: "birthday",
    },
  };
}
