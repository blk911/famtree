"use client";

import { OpportunityWorkflowCard } from "@/components/taikos/workflow/OpportunityWorkflowCard";
import { insightForOpportunity } from "@/lib/taikos/coda/coda";
import type { TaikosInsight } from "@/lib/taikos/coda/types";
import type { TaikosOpportunitySummary } from "@/lib/taikos/opportunities/types";
import type { TaikosGoalListItem } from "@/lib/taikos/goals/types";
import {
  questionCardToIntelligence,
  questionCardToOpportunity,
} from "@/lib/taikos/salon-qa/question-card-to-opportunity";
import type { TodayActiveQuestionResult } from "@/lib/taikos/salon-qa/types";
import type { OpportunityAnalysisContext } from "@/lib/vmb/opportunities/opportunity-intelligence";

type Props = {
  summary: TaikosOpportunitySummary;
  insights?: TaikosInsight[];
  goals?: TaikosGoalListItem[];
  analysisContext?: OpportunityAnalysisContext;
  todayLayout?: boolean;
  questionResult?: TodayActiveQuestionResult | null;
  previewFirstCardSignal?: number;
  onPreviewFirstCardConsumed?: () => void;
  onClearQuestionFilter?: () => void;
  onRefresh?: () => void;
};

export function OpportunityList({
  summary,
  insights = [],
  goals = [],
  analysisContext,
  todayLayout = false,
  questionResult = null,
  previewFirstCardSignal = 0,
  onPreviewFirstCardConsumed,
  onClearQuestionFilter,
  onRefresh,
}: Props) {
  const questionDriven =
    questionResult?.queryMode === "opportunity" && (questionResult?.suggestedCards.length ?? 0) > 0;

  function goalTitleFor(linkedGoalId?: string): string | undefined {
    if (!linkedGoalId) return undefined;
    return goals.find((g) => g.goalId === linkedGoalId)?.title;
  }

  if (questionDriven && questionResult) {
    const cards = questionResult.suggestedCards;
    const candidateLabel = `${cards.length} ${cards.length === 1 ? "candidate" : "candidates"}`;

    return (
      <section className={`taikos-opp-list${todayLayout ? " taikos-opp-list--today" : ""}`}>
        <div className="vmb-today-question-feed-head">
          <div>
            <h3 className="taikos-section-title">Relationship Discoveries</h3>
            <p className="vmb-today-question-feed-head__filter">
              Filtered by: {questionResult.filterLabel ?? "Your question"}
              <span className="vmb-today-question-feed-head__count"> · {candidateLabel}</span>
            </p>
          </div>
          {onClearQuestionFilter ? (
            <button
              type="button"
              className="vmb-today-question-feed-head__clear"
              onClick={onClearQuestionFilter}
            >
              Clear Filter
            </button>
          ) : null}
        </div>
        <div className="taikos-opp-list__items">
          {cards.map((card, index) => {
            const opportunity = questionCardToOpportunity(card, index);
            const intelligence = questionCardToIntelligence(card, opportunity);
            return (
              <OpportunityWorkflowCard
                key={opportunity.opportunityId}
                opportunity={opportunity}
                intelligence={intelligence}
                insight={insightForOpportunity(opportunity, insights)}
                goalTitle={goalTitleFor(opportunity.linkedGoalId)}
                analysisContext={analysisContext}
                layout={todayLayout ? "today" : "standard"}
                autoOpenPreview={index === 0 && previewFirstCardSignal > 0}
                onAutoPreviewConsumed={index === 0 ? onPreviewFirstCardConsumed : undefined}
                onRefresh={onRefresh}
              />
            );
          })}
        </div>
      </section>
    );
  }

  if (summary.opportunities.length === 0) return null;

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
