"use client";

import type { TaikosOpportunity } from "@/lib/taikos/opportunities/types";

type Props = {
  opportunity: TaikosOpportunity;
  onCreateDraft?: (actionType: TaikosOpportunity["suggestedAction"]) => void;
};

export function OpportunityCard({ opportunity, onCreateDraft }: Props) {
  return (
    <article className="taikos-opp-card">
      <div className="taikos-opp-card__head">
        <h4 className="taikos-opp-card__title">{opportunity.title}</h4>
        <span className={`taikos-opp-card__priority taikos-opp-card__priority--${opportunity.priority.toLowerCase()}`}>
          {opportunity.priority}
        </span>
      </div>
      <p className="taikos-opp-card__rec">{opportunity.recommendation}</p>
      <p className="taikos-opp-card__value">
        Value: <strong>${opportunity.estimatedValue.toLocaleString()}</strong>
        <span className="taikos-opp-card__conf"> · {opportunity.confidence}% confidence</span>
      </p>
      {onCreateDraft ? (
        <button
          type="button"
          className="taikos-opp-card__cta"
          onClick={() => onCreateDraft(opportunity.suggestedAction)}
        >
          Create Draft
        </button>
      ) : null}
    </article>
  );
}
