"use client";

import { InlineDeliverablePreview } from "@/components/taikos/workflow/InlineDeliverablePreview";
import { OpportunityLifecycle } from "@/components/taikos/workflow/OpportunityLifecycle";
import { useInlineActionWorkflow } from "@/components/taikos/workflow/useInlineActionWorkflow";
import type { TaikosOpportunity } from "@/lib/taikos/opportunities/types";

type Props = {
  opportunity: TaikosOpportunity;
  goalTitle?: string;
  embedded?: boolean;
  onRefresh?: () => void;
};

export function OpportunityWorkflowCard({ opportunity, goalTitle, embedded, onRefresh }: Props) {
  const workflow = useInlineActionWorkflow({
    actionType: opportunity.suggestedAction,
    sourceId: opportunity.opportunityId,
    onRefresh,
  });

  return (
    <article className={`taikos-opp-card taikos-opp-card--workflow${workflow.expanded ? " taikos-opp-card--expanded" : ""}`}>
      <OpportunityLifecycle stage={workflow.stage} />

      {!embedded ? (
        <>
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
        </>
      ) : null}

      {workflow.stage === "detected" ? (
        <div className="taikos-opp-card__actions">
          <button
            type="button"
            className="taikos-opp-card__cta"
            disabled={workflow.busy}
            onClick={() => void workflow.runPreview()}
          >
            {workflow.busy ? "Loading…" : "Preview"}
          </button>
        </div>
      ) : null}

      {workflow.expanded && workflow.preview ? (
        <div className="taikos-inline-workflow">
          <InlineDeliverablePreview deliverable={workflow.preview.deliverable} />

          {workflow.stage === "drafted" ? (
            <div className="taikos-inline-workflow__actions">
              <button
                type="button"
                className="taikos-opp-card__cta"
                disabled={workflow.busy}
                onClick={() => void workflow.runApprove()}
              >
                {workflow.busy ? "Saving…" : "Approve"}
              </button>
              <button
                type="button"
                className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
                disabled={workflow.busy}
                onClick={workflow.reset}
              >
                Cancel
              </button>
            </div>
          ) : null}

          {workflow.stage === "approved" ? (
            <div className="taikos-inline-workflow__approved">
              <p className="taikos-inline-workflow__message">{workflow.statusMessage}</p>
              <div className="taikos-inline-workflow__actions">
                {workflow.canQueue ? (
                  <button
                    type="button"
                    className="taikos-opp-card__cta"
                    disabled={workflow.busy}
                    onClick={() => void workflow.runQueue()}
                  >
                    Add To Queue
                  </button>
                ) : null}
                <button
                  type="button"
                  className="taikos-opp-card__cta taikos-opp-card__cta--secondary"
                  onClick={workflow.skipQueue}
                >
                  Skip For Now
                </button>
              </div>
            </div>
          ) : null}

          {workflow.stage === "queued" ? (
            <p className="taikos-inline-workflow__message taikos-inline-workflow__message--success" role="status">
              {workflow.statusMessage ?? "Queued. Staying on Today."}
            </p>
          ) : null}
        </div>
      ) : null}

      {workflow.error ? <p className="taikos-inline-workflow__error">{workflow.error}</p> : null}
    </article>
  );
}
