"use client";

import type { TaikosOpportunity } from "@/lib/taikos/opportunities/types";

type Props = {
  opportunity: TaikosOpportunity;
  goalTitle?: string;
  onPreviewDraft?: (actionType: TaikosOpportunity["suggestedAction"]) => void;
  onAddToQueue?: () => void;
  /** @deprecated use onPreviewDraft */
  onCreateDraft?: (actionType: TaikosOpportunity["suggestedAction"]) => void;
};

export function OpportunityCard({
  opportunity,
  goalTitle,
  onPreviewDraft,
  onAddToQueue,
  onCreateDraft,
}: Props) {
  const preview = onPreviewDraft ?? onCreateDraft;

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
      {goalTitle ? <p className="taikos-opp-card__goal">Goal: {goalTitle}</p> : null}
      <div className="taikos-opp-card__actions">
        {preview ? (
          <button type="button" className="taikos-opp-card__cta" onClick={() => preview(opportunity.suggestedAction)}>
            Preview Draft
          </button>
        ) : null}
        {onAddToQueue ? (
          <button type="button" className="taikos-opp-card__cta taikos-opp-card__cta--secondary" onClick={onAddToQueue}>
            Add To Queue
          </button>
        ) : null}
      </div>
    </article>
  );
}
