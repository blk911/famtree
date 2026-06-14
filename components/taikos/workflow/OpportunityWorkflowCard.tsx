"use client";

import { useMemo } from "react";
import { CardPreview } from "@/components/vmb/cards/CardPreview";
import { InlineDeliverablePreview } from "@/components/taikos/workflow/InlineDeliverablePreview";
import { OpportunityLifecycle } from "@/components/taikos/workflow/OpportunityLifecycle";
import {
  TodayProspectCardLayout,
  buildProspectTeaser,
} from "@/components/taikos/workflow/TodayProspectCardLayout";
import { useInlineActionWorkflow } from "@/components/taikos/workflow/useInlineActionWorkflow";
import {
  clientNameFromOpportunity,
  reasonFromOpportunity,
} from "@/lib/taikos/workflow/opportunity-display";
import type { TaikosInsight } from "@/lib/taikos/coda/types";
import type { TaikosOpportunity } from "@/lib/taikos/opportunities/types";
import { buildOpportunityGuideCopy } from "@/lib/taikos/context/today-conversation";
import { cardActionLabel } from "@/lib/vmb/cards/card-type-labels";
import { buildCardPreview } from "@/lib/vmb/cards/card-template-engine";
import {
  buildOpportunityIntelligence,
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
  layout?: "today" | "standard";
  autoOpenPreview?: boolean;
  onAutoPreviewConsumed?: () => void;
  launchGuidePreviewTarget?: boolean;
  onRefresh?: () => void;
};

export function OpportunityWorkflowCard({
  opportunity,
  insight,
  intelligence: intelligenceProp,
  analysisContext,
  goalTitle,
  embedded,
  layout = "standard",
  autoOpenPreview = false,
  onAutoPreviewConsumed,
  launchGuidePreviewTarget = false,
  onRefresh,
}: Props) {
  const intelligence = useMemo(
    () => intelligenceProp ?? buildOpportunityIntelligence(opportunity, analysisContext),
    [intelligenceProp, opportunity, analysisContext],
  );

  const clientName = clientNameFromOpportunity(opportunity);
  const displayName = clientName.split(/\s+/)[0] || clientName;
  const reason = reasonFromOpportunity(opportunity);

  const guide = useMemo(
    () => buildOpportunityGuideCopy(intelligence, clientName, insight?.subjectLabel),
    [intelligence, clientName, insight?.subjectLabel],
  );

  const cardPreview = useMemo(
    () =>
      buildCardPreview({
        cardType: intelligence.suggestedCardType,
        recipientName: intelligence.subjectName ?? clientName,
        salonName: analysisContext?.salonName,
        ticketValue: opportunity.estimatedValue,
        subjectLabel: insight?.subjectLabel ?? guide.roleLabel,
        discoveryText: insight?.discovery ?? intelligence.whatTaikosSees,
        recommendationText: opportunity.recommendation,
      }),
    [
      intelligence,
      opportunity,
      clientName,
      analysisContext?.salonName,
      insight,
      guide.roleLabel,
    ],
  );

  const workflow = useInlineActionWorkflow({
    actionType: opportunity.suggestedAction,
    sourceId: opportunity.opportunityId,
    onRefresh,
  });

  if (layout === "today") {
    const actionLabel = cardActionLabel(
      intelligence.suggestedCardType,
      insight?.suggestedAction ?? opportunity.category,
    );

    return (
      <TodayProspectCardLayout
        prospectId={opportunity.opportunityId}
        displayName={displayName}
        actionLabel={actionLabel}
        confidence={opportunity.confidence}
        collapsedTeaser={buildProspectTeaser(guide.roleLabel, guide.bodyLines)}
        reasonLine={guide.bodyLines[0] ?? intelligence.whatTaikosSees}
        suggestedNextStep={guide.suggestedNextStep}
        cardPreview={cardPreview}
        workflow={workflow}
        autoOpenPreview={autoOpenPreview}
        onAutoPreviewConsumed={onAutoPreviewConsumed}
        launchGuidePreviewTarget={launchGuidePreviewTarget}
      />
    );
  }

  const terminal = workflow.stage === "queued" || workflow.stage === "skipped";

  return (
    <article
      className={`taikos-opp-card taikos-opp-card--workflow${workflow.expanded ? " taikos-opp-card--expanded" : ""}${terminal ? " taikos-opp-card--terminal" : ""}`}
    >
      <OpportunityLifecycle stage={workflow.stage} />

      {!embedded ? (
        <div className="taikos-opp-card__meta">
          <div className="taikos-opp-card__head">
            <h4 className="taikos-opp-card__title">{opportunity.title}</h4>
            <span
              className={`taikos-opp-card__priority taikos-opp-card__priority--${opportunity.priority.toLowerCase()}`}
            >
              {opportunity.priority}
            </span>
          </div>
          <p className="taikos-opp-card__value">
            Value: <strong>${opportunity.estimatedValue.toLocaleString()}</strong>
            <span className="taikos-opp-card__conf"> · {opportunity.confidence}% confidence</span>
          </p>
          {goalTitle ? <p className="taikos-opp-card__goal">Goal: {goalTitle}</p> : null}
          <p className="taikos-opp-card__reason taikos-opp-card__reason--compact">
            {reason}
          </p>
        </div>
      ) : null}

      <div className="taikos-opp-card__split">
        <div className="taikos-opp-card__guide">
          <div className="taikos-opp-card__guide-head">
            <div>
              <h4 className="taikos-insight-card__name">{displayName}</h4>
              <p className="taikos-insight-card__label">{guide.roleLabel}</p>
            </div>
            <span className="taikos-insight-card__confidence">{opportunity.confidence}%</span>
          </div>

          {guide.bodyLines.map((line) => (
            <p key={line} className="taikos-opp-card__guide-line">
              {line}
            </p>
          ))}

          <p className="taikos-opp-card__guide-step-label">Suggested next step:</p>
          <p className="taikos-opp-card__guide-step">{guide.suggestedNextStep}</p>
        </div>

        <div className="taikos-opp-card__card-col">
          <CardPreview
            model={cardPreview}
            editable={workflow.stage === "previewed"}
            compact={embedded}
          />
        </div>
      </div>

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
