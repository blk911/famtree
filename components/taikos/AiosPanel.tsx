"use client";

import { AiosActionLog } from "@/components/taikos/actions/AiosActionLog";
import { AiosDraftList } from "@/components/taikos/drafts/AiosDraftList";
import { AiosActionPreview } from "@/components/taikos/actions/AiosActionPreview";
import { AiosCard } from "@/components/taikos/AiosCard";
import { AiosActionButton } from "@/components/taikos/AiosActionButton";
import { AiosQuestionInput } from "@/components/taikos/AiosQuestionInput";
import { AiosSuggestionChips } from "@/components/taikos/AiosSuggestionChips";
import { resolveContractType } from "@/lib/taikos/actions/action-registry";
import type { TaikosActionPreviewResult } from "@/lib/taikos/actions/types";
import type { AiosAction, AiosPanelLayout, AiosResponse } from "@/lib/taikos/types";

type ActionPreviewState = {
  loading: boolean;
  confirming: boolean;
  preview: TaikosActionPreviewResult | null;
  confirmedMessage: string | null;
  draftId: string | null;
  draftHref: string | null;
  draftReviewHint: string | null;
  queueMessage: string | null;
  queued: boolean;
  logRefresh: number;
  draftRefresh: number;
  queueRefresh: number;
};

type Props = {
  open: boolean;
  response: AiosResponse | null;
  loading?: boolean;
  layout?: AiosPanelLayout;
  actionPreview?: ActionPreviewState | null;
  onClose: () => void;
  onInteraction: () => void;
  onAskQuestion: (question: string) => void;
  onContractAction: (action: AiosAction) => void;
  onConfirmAction: () => void;
  onEnqueueAction: () => void;
  onSkipQueue: () => void;
  onCancelPreview: () => void;
};

export function AiosPanel({
  open,
  response,
  loading,
  layout = "center-panel",
  actionPreview,
  onClose,
  onInteraction,
  onAskQuestion,
  onContractAction,
  onConfirmAction,
  onEnqueueAction,
  onSkipQueue,
  onCancelPreview,
}: Props) {
  if (!open) return null;

  const isCenter = layout === "center-panel" || layout === "docked";
  const showInput = response?.showQuestionInput !== false && response?.mode !== "idle-summary";

  function handleAction(action: AiosAction) {
    onInteraction();
    if (resolveContractType(action)) {
      onContractAction(action);
    }
  }

  const panelClass = `aios-panel aios-panel--${layout}`;

  const panel = (
    <div
      className={panelClass}
      role="dialog"
      aria-label="tAIkOS"
      onClick={(e) => {
        e.stopPropagation();
        onInteraction();
      }}
    >
      <header className="aios-panel__header">
        <div>
          <p className="aios-panel__eyebrow">tAIkOS</p>
          <p className="aios-panel__mode">
            {response?.mode === "briefing"
              ? "Morning briefing"
              : response?.mode === "page-assistant"
                ? "Page assistant"
                : response?.mode === "question"
                  ? "Your question"
                  : response?.mode === "idle-summary"
                    ? "Week summary"
                    : "Concierge"}
          </p>
        </div>
        <button type="button" className="aios-panel__close" onClick={onClose} aria-label="Close tAIkOS">
          ×
        </button>
      </header>

      {actionPreview?.loading ? (
        <p className="aios-panel__loading">Building your draft preview…</p>
      ) : null}

      {actionPreview?.preview ? (
        <AiosActionPreview
          preview={actionPreview.preview}
          confirming={actionPreview.confirming}
          confirmedMessage={actionPreview.confirmedMessage}
          draftId={actionPreview.draftId}
          draftHref={actionPreview.draftHref}
          draftReviewHint={actionPreview.draftReviewHint}
          queueMessage={actionPreview.queueMessage}
          queued={actionPreview.queued}
          onConfirm={onConfirmAction}
          onEnqueue={onEnqueueAction}
          onSkipQueue={onSkipQueue}
          onCancel={onCancelPreview}
          onSkip={onCancelPreview}
        />
      ) : null}

      {loading ? (
        <p className="aios-panel__loading">Preparing your operating brief…</p>
      ) : response ? (
        <div className="aios-panel__body">
          {response.greeting ? <h2 className="aios-panel__greeting">{response.greeting}</h2> : null}
          {response.pageContextLine ? (
            <p className="aios-panel__context-line">{response.pageContextLine}</p>
          ) : null}
          {response.message ? <p className="aios-panel__message">{response.message}</p> : null}
          {response.summary && response.summary !== response.message ? (
            <div className="aios-panel__summary" style={{ whiteSpace: "pre-wrap" }}>
              {response.summary}
            </div>
          ) : null}

          {response.cards.length > 0 ? (
            <div className="aios-panel__cards">
              {response.cards.map((card) => (
                <AiosCard key={card.id} card={card} onAction={handleAction} />
              ))}
            </div>
          ) : null}

          {response.estimatedValue > 0 ? (
            <p className="aios-panel__value">
              Estimated opportunity value:{" "}
              <strong>+${response.estimatedValue.toLocaleString()}</strong>
            </p>
          ) : null}

          {response.followUpPrompt ? (
            <p className="aios-panel__followup">{response.followUpPrompt}</p>
          ) : null}

          {response.recommendedActions.length > 0 ? (
            <div className="aios-panel__actions">
              {response.recommendedActions.map((action) => (
                <AiosActionButton key={action.id} action={action} onClick={handleAction} />
              ))}
            </div>
          ) : null}

          {showInput ? (
            <>
              <AiosSuggestionChips onSelect={onAskQuestion} disabled={loading} />
              <AiosQuestionInput onSubmit={onAskQuestion} disabled={loading} />
            </>
          ) : null}

          <AiosDraftList refreshKey={actionPreview?.draftRefresh ?? 0} />
          <AiosActionLog refreshKey={actionPreview?.logRefresh ?? 0} />
        </div>
      ) : (
        <p className="aios-panel__loading">Connect your book to unlock tAIkOS.</p>
      )}
    </div>
  );

  if (isCenter) {
    return (
      <div className="aios-center-layer" role="presentation">
        <div className="aios-center-layer__scrim" onClick={onClose} aria-hidden />
        <div className="aios-center-layer__panel">{panel}</div>
      </div>
    );
  }

  return (
    <div className="aios-panel-backdrop" role="presentation" onClick={onClose}>
      {panel}
    </div>
  );
}
