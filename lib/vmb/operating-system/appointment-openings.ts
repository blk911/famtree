import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

export type AppointmentOpeningsSummary = {
  count: number;
  slots: string[];
};

const DEFAULT_SLOTS = ["Thursday 2:00", "Friday 11:30", "Saturday 10:00"] as const;

/** Lightweight weekly opening hints derived from book signals — not live scheduling. */
export function buildAppointmentOpeningsSummary(
  analysis: VmbBookAnalysisResult,
): AppointmentOpeningsSummary {
  const rebookSignals = analysis.referralOpportunities.filter((o) =>
    /rebook|appointment|visit|next/i.test(o.summary ?? o.suggestedAction ?? ""),
  ).length;
  const poolSize = analysis.recordCount ?? 0;
  const count = Math.min(3, Math.max(1, rebookSignals > 0 ? 2 : poolSize > 20 ? 2 : 1));
  return {
    count,
    slots: DEFAULT_SLOTS.slice(0, count),
  };
}
