"use client";

import { OpportunityWorkflowCard } from "@/components/taikos/workflow/OpportunityWorkflowCard";
import { insightForOpportunity } from "@/lib/taikos/coda/coda";
import type { TaikosInsight } from "@/lib/taikos/coda/types";
import type { TaikosOpportunitySummary } from "@/lib/taikos/opportunities/types";
import type { TaikosGoalListItem } from "@/lib/taikos/goals/types";
import type { OpportunityAnalysisContext } from "@/lib/vmb/opportunities/opportunity-intelligence";

type Props = {
  summary: TaikosOpportunitySummary;
  insights?: TaikosInsight[];
  goals?: TaikosGoalListItem[];
  analysisContext?: OpportunityAnalysisContext;
  todayLayout?: boolean;
  onRefresh?: () => void;
};

export function OpportunityList({
  summary,
  insights = [],
  goals = [],
  analysisContext,
  todayLayout = false,
  onRefresh,
}: Props) {
  if (summary.opportunities.length === 0) return null;

  function goalTitleFor(linkedGoalId?: string): string | undefined {
    if (!linkedGoalId) return undefined;
    return goals.find((g) => g.goalId === linkedGoalId)?.title;
  }

  return (
    <section className={`taikos-opp-list${todayLayout ? " taikos-opp-list--today" : ""}`}>
      {!todayLayout ? (
        <>
          <h3 className="taikos-section-title">Top Opportunities</h3>
          <p className="taikos-opp-list__hint">Preview a suggested card, approve, and queue — all from Today.</p>
        </>
      ) : null}
      <div className="taikos-opp-list__items">
        {summary.opportunities.slice(0, 6).map((opp) => (
          <OpportunityWorkflowCard
            key={opp.opportunityId}
            opportunity={opp}
            insight={insightForOpportunity(opp, insights)}
            goalTitle={goalTitleFor(opp.linkedGoalId)}
            analysisContext={analysisContext}
            layout={todayLayout ? "today" : "standard"}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </section>
  );
}
