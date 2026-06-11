import { buildAppointmentOpeningsSummary } from "@/lib/vmb/operating-system/appointment-openings";
import type { AiosRuleResult } from "@/lib/taikos/types";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

export function runOpenSlotRule(analysis: VmbBookAnalysisResult | undefined): AiosRuleResult | null {
  if (!analysis) return null;
  const openings = buildAppointmentOpeningsSummary(analysis);
  if (openings.count === 0) return null;

  const value = openings.count * 85;

  return {
    ruleId: "open-slot",
    severity: "info",
    value,
    recommendation: `You have ${openings.count} open appointment opportunit${openings.count === 1 ? "y" : "ies"} this week.`,
    actions: [
      {
        id: "open-appointments",
        label: "Review fill options",
        kind: "navigate",
        href: "/vmb/appointments",
      },
    ],
    opportunity: {
      id: "open-slots",
      title: "Open appointment windows",
      description: openings.slots.join(" · "),
      estimatedValue: value,
      severity: "info",
      sourceRule: "open-slot",
    },
  };
}
