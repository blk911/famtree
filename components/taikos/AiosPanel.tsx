"use client";

import { useEffect, useState } from "react";
import { AiosCard } from "@/components/taikos/AiosCard";
import { AiosActionButton } from "@/components/taikos/AiosActionButton";
import { AiosQuestionInput } from "@/components/taikos/AiosQuestionInput";
import { AiosSuggestionChips } from "@/components/taikos/AiosSuggestionChips";
import type { AiosAction, AiosPanelLayout, AiosResponse } from "@/lib/taikos/types";

type Props = {
  open: boolean;
  response: AiosResponse | null;
  loading?: boolean;
  layout?: AiosPanelLayout;
  onClose: () => void;
  onInteraction: () => void;
  onAskQuestion: (question: string) => void;
};

export function AiosPanel({
  open,
  response,
  loading,
  layout = "center-panel",
  onClose,
  onInteraction,
  onAskQuestion,
}: Props) {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  if (!open) return null;

  const isCenter = layout === "center-panel" || layout === "docked";
  const showInput = response?.showQuestionInput !== false && response?.mode !== "idle-summary";

  function handleAction(action: AiosAction) {
    onInteraction();
    if (!action.href) {
      setToast("Action preview only — execution comes in a later phase.");
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

      {toast ? <p className="aios-panel__toast">{toast}</p> : null}

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
