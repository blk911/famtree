import { enrichPageContextWithDrafts } from "@/lib/taikos/context/draft-context";
import type { TaikosActivitySummary } from "@/lib/taikos/activity/activity-types";
import type { TaikosDraftSummary } from "@/lib/taikos/drafts/types";
import type { TaikosGoalSummary } from "@/lib/taikos/goals/types";
import type { TaikosOpportunitySummary } from "@/lib/taikos/opportunities/types";
import type { TaikosQueueSummary } from "@/lib/taikos/queue/types";
import type { AiosPageContext } from "@/lib/taikos/types";

type OperatingSummaries = {
  draftSummary: TaikosDraftSummary;
  goalSummary: TaikosGoalSummary;
  opportunitySummary: TaikosOpportunitySummary;
  queueSummary: TaikosQueueSummary;
  activitySummary: TaikosActivitySummary;
};

export function enrichPageContextWithOperatingState(
  page: AiosPageContext,
  summaries: OperatingSummaries,
): AiosPageContext {
  const withDrafts = enrichPageContextWithDrafts(page, summaries.draftSummary);
  const hints: string[] = [];

  if (summaries.goalSummary.activeGoals > 0) {
    hints.push(`${summaries.goalSummary.activeGoals} active goal${summaries.goalSummary.activeGoals === 1 ? "" : "s"}`);
  }
  if (summaries.opportunitySummary.highPriority > 0) {
    hints.push(`${summaries.opportunitySummary.highPriority} high-priority opportunit${summaries.opportunitySummary.highPriority === 1 ? "y" : "ies"}`);
  }
  if (summaries.queueSummary.queuedItems > 0) {
    hints.push(`${summaries.queueSummary.queuedItems} queued`);
  }
  if (summaries.activitySummary.totalEvents > 0) {
    hints.push(`${summaries.activitySummary.totalEvents} recent business event${summaries.activitySummary.totalEvents === 1 ? "" : "s"}`);
  }

  if (hints.length === 0) return withDrafts;

  return {
    ...withDrafts,
    assistantIntro: `${withDrafts.assistantIntro} Right now: ${hints.join(", ")}.`,
  };
}
