"use client";

import { useMemo, useState } from "react";
import { CardPreview } from "@/components/vmb/cards/CardPreview";
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
import { buildCardPreview } from "@/lib/vmb/cards/card-template-engine";
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
  const [cardExpanded, setCardExpanded] = useState(true);

  const intelligence = useMemo(
    () => intelligenceProp ?? buildOpportunityIntelligence(opportunity, analysisContext),
    [intelligenceProp, opportunity, analysisContext],
  );

  const cardPreview = useMemo(
    () =>
      buildCardPreview({
        cardType: intelligence.suggestedCardType,
        recipientName: intelligence.subjectName ?? clientNameFromOpportunity(opportunity),
        salonName: analysisContext?.salonName,
        ticketValue: opportunity.estimatedValue,
      }),
    [intelligence, opportunity, analysisContext?.salonName],
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
          <p className="taikos-opp-card__value">
            Value: <strong>${opportunity.estimatedValue.toLocaleString()}</strong>
            <span className="taikos-opp-card__conf"> · {opportunity.confidence}% confidence</span>
          </p>
          {goalTitle ? <p className="taikos-opp-card__goal">Goal: {goalTitle}</p> : null}
          {insight ? <TaikosInsightBlock insight={insight} /> : null}
        </>
      ) : null}

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
            {!embedded ? (
              <>
                Action: <strong>{actionLabel}</strong>
                {" · "}
              </>
            ) : null}
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

      <section className="taikos-opp-card__suggested-card">
        <div className="taikos-opp-card__suggested-card-head">
          <p className="taikos-opp-card__intel-label">Suggested card</p>
          <button
            type="button"
            className="taikos-opp-card__card-toggle"
            onClick={() => setCardExpanded((open) => !open)}
            aria-expanded={cardExpanded}
          >
            {cardExpanded ? "Collapse" : "Expand"}
          </button>
        </div>
        {cardExpanded ? (
          <CardPreview model={cardPreview} editable={workflow.stage === "previewed"} compact={embedded} />
        ) : (
          <p className="taikos-opp-card__card-collapsed">
            {cardPreview.title} — tap Expand to preview the card.
          </p>
        )}
      </section>

      {workflow.stage === "detected" ? (
        <div className="taikos-opp-card__actions">
          <button
            type="button"
            className="taikos-opp-card__cta"
            disabled={workflow.busy}
            onClick={() => {
              setCardExpanded(true);
              void workflow.runPreview();
            }}
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
          <details className="taikos-inline-workflow__deliverable-details">
            <summary>Draft detail</summary>
            <InlineDeliverablePreview deliverable={workflow.preview.deliverable} />
          </details>

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
