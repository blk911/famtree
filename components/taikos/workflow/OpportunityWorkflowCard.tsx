"use client";

import { useMemo } from "react";
import { InlineDeliverablePreview } from "@/components/taikos/workflow/InlineDeliverablePreview";
import { OpportunityLifecycle } from "@/components/taikos/workflow/OpportunityLifecycle";
import { useInlineActionWorkflow } from "@/components/taikos/workflow/useInlineActionWorkflow";
import { TaikosInsightBlock } from "@/components/taikos/coda/TaikosInsightBlock";
import {
  clientNameFromOpportunity,
  reasonFromOpportunity,
  suggestedActionLabel,
} from "@/lib/taikos/workflow/opportunity-display";
import type { TaikosInsight } from "@/lib/taikos/coda/types";
import type { TaikosOpportunity } from "@/lib/taikos/opportunities/types";
import {
  buildOpportunityIntelligence,
  suggestedCardTypeLabel,
  type OpportunityAnalysisContext,
  type OpportunityIntelligence,
} from "@/lib/vmb/opportunities/opportunity-intelligence";

type Props = {
  opportunity: TaikosOpportunity;
  insight?: TaikosInsight;
  intelligence?: OpportunityIntelligence;
  analysisContext?: OpportunityAnalysisContext;
  goalTitle?: string;
  embedded?: boolean;
  onRefresh?: () => void;
};

export function OpportunityWorkflowCard({
  opportunity,
  insight,
  intelligence: intelligenceProp,
  analysisContext,
  goalTitle,
  embedded,
  onRefresh,
}: Props) {
  const intelligence = useMemo(
    () => intelligenceProp ?? buildOpportunityIntelligence(opportunity, analysisContext),
    [intelligenceProp, opportunity, analysisContext],
  );

  const workflow = useInlineActionWorkflow({
    actionType: opportunity.suggestedAction,
    sourceId: opportunity.opportunityId,
    onRefresh,
  });

  const clientName = clientNameFromOpportunity(opportunity);
  const reason = reasonFromOpportunity(opportunity);
  const actionLabel = suggestedActionLabel(opportunity);
  const terminal = workflow.stage === "queued" || workflow.stage === "skipped";

  return (
    <article
      className={`taikos-opp-card taikos-opp-card--workflow${workflow.expanded ? " taikos-opp-card--expanded" : ""}${terminal ? " taikos-opp-card--terminal" : ""}`}
    >
      <OpportunityLifecycle stage={workflow.stage} />

      {!embedded ? (
        <>
          <div className="taikos-opp-card__head">
            <h4 className="taikos-opp-card__title">{opportunity.title}</h4>
            <span
              className={`taikos-opp-card__priority taikos-opp-card__priority--${opportunity.priority.toLowerCase()}`}
            >
              {opportunity.priority}
            </span>
          </div>
          <p className="taikos-opp-card__client">
            Client: <strong>{clientName}</strong>
          </p>
          <p className="taikos-opp-card__reason">
            Reason: <span>{reason}</span>
          </p>
          <p className="taikos-opp-card__action-hint">
            Suggested: <strong>{actionLabel}</strong>
          </p>
          <p className="taikos-opp-card__value">
            Value: <strong>${opportunity.estimatedValue.toLocaleString()}</strong>
            <span className="taikos-opp-card__conf"> · {opportunity.confidence}% confidence</span>
          </p>
          {goalTitle ? <p className="taikos-opp-card__goal">Goal: {goalTitle}</p> : null}
          {insight ? <TaikosInsightBlock insight={insight} /> : null}

          <div className="taikos-opp-card__intel">
            <div className="taikos-opp-card__intel-section">
              <p className="taikos-opp-card__intel-label">tAIkOS insight</p>
              <p className="taikos-opp-card__intel-title">{intelligence.insightTitle}</p>
              <p className="taikos-opp-card__intel-copy">{intelligence.whatTaikosSees}</p>
            </div>
            <div className="taikos-opp-card__intel-section">
              <p className="taikos-opp-card__intel-label">Why this matters</p>
              <p className="taikos-opp-card__intel-copy">{intelligence.whyThisMatters}</p>
            </div>
            <div className="taikos-opp-card__intel-section">
              <p className="taikos-opp-card__intel-label">Suggested move</p>
              <p className="taikos-opp-card__intel-copy">{intelligence.suggestedRelationshipMove}</p>
              <p className="taikos-opp-card__intel-card-type">
                Card: <strong>{suggestedCardTypeLabel(intelligence.suggestedCardType)}</strong>
              </p>
            </div>
            {intelligence.evidence.length > 0 ? (
              <details className="taikos-opp-card__intel-evidence">
                <summary>Evidence</summary>
                <ul>
                  {intelligence.evidence.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
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
          <button
            type="button"
            className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
            disabled={workflow.busy}
            onClick={workflow.skipReject}
          >
            Skip
          </button>
        </div>
      ) : null}

      {workflow.expanded && workflow.preview ? (
        <div className="taikos-inline-workflow">
          <InlineDeliverablePreview deliverable={workflow.preview.deliverable} />

          {workflow.stage === "previewed" ? (
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
                onClick={workflow.skipReject}
              >
                Skip
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
                    {workflow.busy ? "Queuing…" : "Add To Queue"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="taikos-opp-card__cta taikos-opp-card__cta--secondary"
                  onClick={workflow.skipQueue}
                >
                  Skip
                </button>
              </div>
            </div>
          ) : null}

          {workflow.stage === "queued" ? (
            <p className="taikos-inline-workflow__message taikos-inline-workflow__message--success" role="status">
              {workflow.statusMessage ?? "Added to queue. No message sent yet."}
            </p>
          ) : null}

          {workflow.stage === "blocked" ? (
            <p className="taikos-inline-workflow__error" role="alert">
              {workflow.error ?? "Queue blocked — try again or skip."}
            </p>
          ) : null}
        </div>
      ) : null}

      {workflow.stage === "skipped" && workflow.statusMessage ? (
        <p className="taikos-inline-workflow__message">{workflow.statusMessage}</p>
      ) : null}

      {workflow.error && workflow.stage !== "blocked" ? (
        <p className="taikos-inline-workflow__error">{workflow.error}</p>
      ) : null}
    </article>
  );
}
