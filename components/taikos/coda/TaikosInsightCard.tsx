"use client";

import { useMemo } from "react";
import { CardPreview } from "@/components/vmb/cards/CardPreview";
import { InlineDeliverablePreview } from "@/components/taikos/workflow/InlineDeliverablePreview";
import { OpportunityLifecycle } from "@/components/taikos/workflow/OpportunityLifecycle";
import { useInlineActionWorkflow } from "@/components/taikos/workflow/useInlineActionWorkflow";
import { cardTypeFromActionType } from "@/lib/taikos/context/insight-card-type";
import { buildInsightGuideCopy } from "@/lib/taikos/context/today-conversation";
import type { TaikosInsight } from "@/lib/taikos/coda/types";
import { buildCardPreview } from "@/lib/vmb/cards/card-template-engine";

type Props = {
  insight: TaikosInsight;
  onRefresh?: () => void;
};

export function TaikosInsightCard({ insight, onRefresh }: Props) {
  const workflow = useInlineActionWorkflow({
    actionType: insight.actionType,
    sourceId: insight.id,
    onRefresh,
  });

  const guide = useMemo(() => buildInsightGuideCopy(insight), [insight]);
  const cardPreview = useMemo(
    () =>
      buildCardPreview({
        cardType: cardTypeFromActionType(insight.actionType),
        recipientName: insight.subjectName,
      }),
    [insight.actionType, insight.subjectName],
  );

  const displayName = insight.subjectName.split(/\s+/)[0] || insight.subjectName;

  return (
    <article
      className={`taikos-insight-card${workflow.expanded ? " taikos-insight-card--expanded" : ""}`}
    >
      <OpportunityLifecycle stage={workflow.stage} />

      <div className="taikos-opp-card__split">
        <div className="taikos-opp-card__guide">
          <div className="taikos-insight-card__head">
            <div>
              <h4 className="taikos-insight-card__name">{displayName}</h4>
              <p className="taikos-insight-card__label">{insight.subjectLabel}</p>
            </div>
            <span className="taikos-insight-card__confidence">{insight.confidence}%</span>
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
          <CardPreview model={cardPreview} compact />
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
        </div>
      ) : null}

      {workflow.error ? <p className="taikos-inline-workflow__error">{workflow.error}</p> : null}
    </article>
  );
}
