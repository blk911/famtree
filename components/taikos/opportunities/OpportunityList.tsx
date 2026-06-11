"use client";

import { OpportunityCard } from "@/components/taikos/opportunities/OpportunityCard";
import type { TaikosOpportunitySummary } from "@/lib/taikos/opportunities/types";
import type { TaikosActionType } from "@/lib/taikos/types";

type Props = {
  summary: TaikosOpportunitySummary;
  onCreateDraft?: (actionType: TaikosActionType) => void;
};

export function OpportunityList({ summary, onCreateDraft }: Props) {
  if (summary.opportunities.length === 0) return null;
  return (
    <section className="taikos-opp-list">
      <h3 className="taikos-section-title">Top Opportunities</h3>
      <div className="taikos-opp-list__items">
        {summary.opportunities.slice(0, 5).map((opp) => (
          <OpportunityCard
            key={opp.opportunityId}
            opportunity={opp}
            onCreateDraft={onCreateDraft}
          />
        ))}
      </div>
    </section>
  );
}
