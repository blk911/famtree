"use client";

import { InlineDeliverablePreview } from "@/components/taikos/workflow/InlineDeliverablePreview";
import { OpportunityLifecycle } from "@/components/taikos/workflow/OpportunityLifecycle";
import { useInlineActionWorkflow } from "@/components/taikos/workflow/useInlineActionWorkflow";
import type { TaikosInsight } from "@/lib/taikos/coda/types";

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

  return (
    <article
      className={`taikos-insight-card${workflow.expanded ? " taikos-insight-card--expanded" : ""}`}
    >
      <OpportunityLifecycle stage={workflow.stage} />

      <div className="taikos-insight-card__head">
        <div>
          <h4 className="taikos-insight-card__name">{insight.subjectName.split(/\s+/)[0]}</h4>
          <p className="taikos-insight-card__label">{insight.subjectLabel}</p>
        </div>
        <span className="taikos-insight-card__confidence">{insight.confidence}%</span>
      </div>

      <div className="taikos-insight-card__coda">
        <p className="taikos-insight-card__field">
          <span className="taikos-insight-card__field-label">Objective</span>
          {insight.objective}
        </p>
        <p className="taikos-insight-card__field">
          <span className="taikos-insight-card__field-label">Discovery</span>
          {insight.discovery}
        </p>
        <p className="taikos-insight-card__field taikos-insight-card__field--curiosity">
          <span className="taikos-insight-card__field-label">Curiosity</span>
          {insight.curiosityPrompt}
        </p>
        <p className="taikos-insight-card__field">
          <span className="taikos-insight-card__field-label">Suggested Action</span>
          {insight.suggestedAction}
        </p>
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
