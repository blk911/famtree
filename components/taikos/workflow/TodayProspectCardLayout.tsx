"use client";

import { useState } from "react";
import { CardPreviewModal } from "@/components/vmb/cards/CardPreviewModal";
import { InlineDeliverablePreview } from "@/components/taikos/workflow/InlineDeliverablePreview";
import { OpportunityLifecycle } from "@/components/taikos/workflow/OpportunityLifecycle";
import type { useInlineActionWorkflow } from "@/components/taikos/workflow/useInlineActionWorkflow";
import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";

type Workflow = ReturnType<typeof useInlineActionWorkflow>;

type Props = {
  displayName: string;
  roleLabel: string;
  confidence: number;
  compactLine: string;
  bodyLines: string[];
  suggestedNextStep: string;
  evidence?: string[];
  cardPreview: CardPreviewModel;
  workflow: Workflow;
  showDeliverableDetail?: boolean;
};

export function TodayProspectCardLayout({
  displayName,
  roleLabel,
  confidence,
  compactLine,
  bodyLines,
  suggestedNextStep,
  evidence = [],
  cardPreview,
  workflow,
  showDeliverableDetail = false,
}: Props) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const terminal = workflow.stage === "queued" || workflow.stage === "skipped";

  async function handlePreview() {
    setDetailsExpanded(true);
    setModalOpen(true);
    if (workflow.stage === "detected") {
      await workflow.runPreview();
    }
  }

  function handleOpenModal() {
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
  }

  function expandDetails() {
    setDetailsExpanded(true);
  }

  return (
    <>
      <article
        className={`taikos-prospect-card${detailsExpanded ? " taikos-prospect-card--expanded" : ""}${terminal ? " taikos-prospect-card--terminal" : ""}`}
      >
        <OpportunityLifecycle stage={workflow.stage} compact />

        {!detailsExpanded ? (
          <div className="taikos-prospect-card__compact">
            <button
              type="button"
              className="taikos-prospect-card__compact-main"
              onClick={expandDetails}
              aria-expanded={false}
            >
              <div className="taikos-prospect-card__compact-copy">
                <h4 className="taikos-prospect-card__name">{displayName}</h4>
                <p className="taikos-prospect-card__teaser">{compactLine}</p>
              </div>
              <span className="taikos-prospect-card__confidence">{confidence}%</span>
            </button>

            <div className="taikos-prospect-card__compact-actions">
              {workflow.stage === "detected" ? (
                <>
                  <button
                    type="button"
                    className="taikos-opp-card__cta"
                    disabled={workflow.busy}
                    onClick={() => void handlePreview()}
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
                </>
              ) : null}

              {workflow.stage === "previewed" ? (
                <>
                  <button
                    type="button"
                    className="taikos-opp-card__cta"
                    disabled={workflow.busy}
                    onClick={handleOpenModal}
                  >
                    View Card
                  </button>
                  <button
                    type="button"
                    className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
                    disabled={workflow.busy}
                    onClick={workflow.skipReject}
                  >
                    Skip
                  </button>
                </>
              ) : null}

              {workflow.stage === "approved" ? (
                <>
                  <button
                    type="button"
                    className="taikos-opp-card__cta"
                    onClick={handleOpenModal}
                  >
                    View Card
                  </button>
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
                    className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
                    onClick={workflow.skipQueue}
                  >
                    Skip
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div className="taikos-prospect-card__guide">
              <button
                type="button"
                className="taikos-prospect-card__guide-head"
                onClick={() => setDetailsExpanded(true)}
                aria-expanded
              >
                <div>
                  <h4 className="taikos-prospect-card__name">{displayName}</h4>
                  <p className="taikos-prospect-card__role">{roleLabel}</p>
                </div>
                <span className="taikos-prospect-card__confidence">{confidence}%</span>
              </button>

              {bodyLines.map((line) => (
                <p key={line} className="taikos-prospect-card__line">
                  {line}
                </p>
              ))}

              <p className="taikos-prospect-card__step-label">Suggested next step:</p>
              <p className="taikos-prospect-card__step">{suggestedNextStep}</p>

              {evidence.length > 0 ? (
                <details className="taikos-prospect-card__why">
                  <summary>Why this?</summary>
                  <ul>
                    {evidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>

            <div className="taikos-prospect-card__actions">
              {workflow.stage === "detected" ? (
                <>
                  <button
                    type="button"
                    className="taikos-opp-card__cta"
                    disabled={workflow.busy}
                    onClick={() => void handlePreview()}
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
                </>
              ) : null}

              {workflow.stage === "previewed" ? (
                <>
                  <button
                    type="button"
                    className="taikos-opp-card__cta"
                    disabled={workflow.busy}
                    onClick={handleOpenModal}
                  >
                    View Card
                  </button>
                  <button
                    type="button"
                    className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
                    disabled={workflow.busy}
                    onClick={workflow.skipReject}
                  >
                    Skip
                  </button>
                </>
              ) : null}

              {workflow.stage === "approved" ? (
                <>
                  <button
                    type="button"
                    className="taikos-opp-card__cta"
                    onClick={handleOpenModal}
                  >
                    View Card
                  </button>
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
                    className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
                    onClick={workflow.skipQueue}
                  >
                    Skip
                  </button>
                </>
              ) : null}
            </div>
          </>
        )}

        {workflow.expanded && workflow.preview && showDeliverableDetail ? (
          <details className="taikos-inline-workflow__deliverable-details">
            <summary>Draft detail</summary>
            <InlineDeliverablePreview deliverable={workflow.preview.deliverable} />
          </details>
        ) : null}

        {workflow.stage === "queued" ? (
          <p className="taikos-inline-workflow__message taikos-inline-workflow__message--success" role="status">
            {workflow.statusMessage ?? "Added to queue. No message sent yet."}
          </p>
        ) : null}

        {workflow.stage === "skipped" && workflow.statusMessage ? (
          <p className="taikos-inline-workflow__message">{workflow.statusMessage}</p>
        ) : null}

        {workflow.stage === "blocked" ? (
          <p className="taikos-inline-workflow__error" role="alert">
            {workflow.error ?? "Queue blocked — try again or skip."}
          </p>
        ) : null}

        {workflow.error && workflow.stage !== "blocked" ? (
          <p className="taikos-inline-workflow__error">{workflow.error}</p>
        ) : null}
      </article>

      <CardPreviewModal
        open={modalOpen}
        cardPreview={cardPreview}
        recipientLabel={displayName}
        workflow={workflow}
        onClose={handleCloseModal}
      />
    </>
  );
}

function buildCompactLine(roleLabel: string, bodyLines: string[], suggestedNextStep: string): string {
  const teaser = bodyLines[1] ?? bodyLines[0] ?? suggestedNextStep;
  return `${roleLabel} — ${teaser}`;
}

export { buildCompactLine };
