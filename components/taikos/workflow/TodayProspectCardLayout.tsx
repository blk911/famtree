"use client";

import { useEffect, useState } from "react";
import { CardPreviewModal } from "@/components/vmb/cards/CardPreviewModal";
import { OpportunityLifecycle } from "@/components/taikos/workflow/OpportunityLifecycle";
import { useTodayProspectFeed } from "@/components/taikos/workflow/TodayProspectFeedContext";
import type { useInlineActionWorkflow } from "@/components/taikos/workflow/useInlineActionWorkflow";
import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";

type Workflow = ReturnType<typeof useInlineActionWorkflow>;

type Props = {
  prospectId: string;
  displayName: string;
  actionLabel: string;
  confidence: number;
  collapsedTeaser: string;
  reasonLine: string;
  suggestedNextStep: string;
  cardPreview: CardPreviewModel;
  workflow: Workflow;
  autoOpenPreview?: boolean;
  onAutoPreviewConsumed?: () => void;
};

function ProspectActionButtons({
  workflow,
  onPreview,
  onOpenModal,
}: {
  workflow: Workflow;
  onPreview: () => void;
  onOpenModal: () => void;
}) {
  if (workflow.stage === "detected") {
    return (
      <>
        <button
          type="button"
          className="taikos-opp-card__cta"
          disabled={workflow.busy}
          onClick={(e) => {
            e.stopPropagation();
            void onPreview();
          }}
        >
          {workflow.busy ? "Loading…" : "Preview"}
        </button>
        <button
          type="button"
          className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
          disabled={workflow.busy}
          onClick={(e) => {
            e.stopPropagation();
            workflow.skipReject();
          }}
        >
          Skip
        </button>
      </>
    );
  }

  if (workflow.stage === "previewed") {
    return (
      <>
        <button
          type="button"
          className="taikos-opp-card__cta"
          disabled={workflow.busy}
          onClick={(e) => {
            e.stopPropagation();
            onOpenModal();
          }}
        >
          View Card
        </button>
        <button
          type="button"
          className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
          disabled={workflow.busy}
          onClick={(e) => {
            e.stopPropagation();
            workflow.skipReject();
          }}
        >
          Skip
        </button>
      </>
    );
  }

  if (workflow.stage === "approved") {
    return (
      <>
        <button
          type="button"
          className="taikos-opp-card__cta"
          onClick={(e) => {
            e.stopPropagation();
            onOpenModal();
          }}
        >
          View Card
        </button>
        {workflow.canQueue ? (
          <button
            type="button"
            className="taikos-opp-card__cta"
            disabled={workflow.busy}
            onClick={(e) => {
              e.stopPropagation();
              void workflow.runQueue();
            }}
          >
            {workflow.busy ? "Queuing…" : "Add To Queue"}
          </button>
        ) : null}
        <button
          type="button"
          className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
          onClick={(e) => {
            e.stopPropagation();
            workflow.skipQueue();
          }}
        >
          Skip
        </button>
      </>
    );
  }

  return null;
}

export function TodayProspectCardLayout({
  prospectId,
  displayName,
  actionLabel,
  confidence,
  collapsedTeaser,
  reasonLine,
  suggestedNextStep,
  cardPreview,
  workflow,
  autoOpenPreview = false,
  onAutoPreviewConsumed,
}: Props) {
  const feed = useTodayProspectFeed();
  const [localExpanded, setLocalExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const expanded = feed ? feed.isExpanded(prospectId) : localExpanded;
  const terminal = workflow.stage === "queued" || workflow.stage === "skipped";
  const collapsedLine = `${displayName} — ${actionLabel} — ${collapsedTeaser} — ${confidence}%`;

  function toggleExpanded() {
    if (feed) {
      feed.toggleExpanded(prospectId);
      return;
    }
    setLocalExpanded((open) => !open);
  }

  async function handlePreview() {
    setModalOpen(true);
    if (workflow.stage === "detected") {
      await workflow.runPreview();
    }
  }

  useEffect(() => {
    if (!autoOpenPreview) return;
    void handlePreview();
    onAutoPreviewConsumed?.();
  }, [autoOpenPreview]);

  function handleOpenModal() {
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
  }

  return (
    <>
      <article
        className={`taikos-prospect-card${expanded ? " taikos-prospect-card--expanded" : ""}${terminal ? " taikos-prospect-card--terminal" : ""}`}
      >
        <OpportunityLifecycle stage={workflow.stage} compact />

        <div className="taikos-prospect-card__accordion">
          <button
            type="button"
            className="taikos-prospect-card__accordion-toggle"
            onClick={toggleExpanded}
            aria-expanded={expanded}
          >
            <span className="taikos-prospect-card__chevron" aria-hidden>
              {expanded ? "▾" : "▸"}
            </span>
            <span className="taikos-prospect-card__collapsed-line">{collapsedLine}</span>
          </button>

          {expanded ? (
            <div className="taikos-prospect-card__expanded-body">
              <p className="taikos-prospect-card__reason">{reasonLine}</p>
              <p className="taikos-prospect-card__step-label">Suggested move</p>
              <p className="taikos-prospect-card__step">{suggestedNextStep}</p>
            </div>
          ) : null}

          <div className="taikos-prospect-card__compact-actions">
            <ProspectActionButtons
              workflow={workflow}
              onPreview={handlePreview}
              onOpenModal={handleOpenModal}
            />
          </div>
        </div>

        {workflow.stage === "queued" ? (
          <p className="taikos-inline-workflow__message taikos-inline-workflow__message--success" role="status">
            {workflow.statusMessage ?? "Added to queue."}
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
        displayName={displayName}
        actionLabel={actionLabel}
        workflow={workflow}
        onClose={handleCloseModal}
      />
    </>
  );
}

export function buildProspectTeaser(roleLabel: string, bodyLines: string[]): string {
  const hay = `${roleLabel} ${bodyLines.join(" ")}`.toLowerCase();
  if (hay.includes("ambassador") || hay.includes("bring other") || hay.includes("referral")) {
    return "likely ambassador";
  }
  if (hay.includes("vip") || hay.includes("high-value") || hay.includes("high value")) {
    return "VIP client";
  }
  if (hay.includes("refresh") || hay.includes("overdue")) return "due for refresh";
  if (hay.includes("birthday")) return "birthday coming up";
  if (hay.includes("reactivat") || hay.includes("lapsed") || hay.includes("has not returned")) {
    return "past client";
  }
  if (hay.includes("open slot") || hay.includes("calendar gap")) return "open slot match";
  return roleLabel.toLowerCase();
}

/** @deprecated Use buildProspectTeaser */
function buildCompactLine(roleLabel: string, bodyLines: string[], _suggestedNextStep: string): string {
  return `${roleLabel} — ${buildProspectTeaser(roleLabel, bodyLines)}`;
}

export { buildCompactLine };
