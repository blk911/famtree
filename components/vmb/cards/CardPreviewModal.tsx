"use client";

import { useEffect } from "react";
import { CardPreview } from "@/components/vmb/cards/CardPreview";
import type { useInlineActionWorkflow } from "@/components/taikos/workflow/useInlineActionWorkflow";
import { useEditableCardDraft } from "@/lib/vmb/cards/use-editable-card-draft";
import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";

type Workflow = ReturnType<typeof useInlineActionWorkflow>;

type Props = {
  open: boolean;
  cardPreview: CardPreviewModel;
  recipientLabel?: string;
  workflow: Workflow;
  onClose: () => void;
};

export function CardPreviewModal({
  open,
  cardPreview,
  recipientLabel,
  workflow,
  onClose,
}: Props) {
  const { draft, patchDraft, snapshotDraft, restoreDraft } = useEditableCardDraft(cardPreview);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  function handleSaveEdits() {
    snapshotDraft();
  }

  function handleCancelEdits() {
    restoreDraft();
  }

  return (
    <div
      className="vmb-card-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Card preview"
      onClick={onClose}
    >
      <div className="vmb-card-preview-modal__panel" onClick={(e) => e.stopPropagation()}>
        <header className="vmb-card-preview-modal__header">
          <div>
            <p className="vmb-card-preview-modal__eyebrow">Blue Mountain preview</p>
            <h2 className="vmb-card-preview-modal__title">
              {recipientLabel ? `Card for ${recipientLabel}` : "Relationship card"}
            </h2>
          </div>
          <button
            type="button"
            className="vmb-card-preview-modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="vmb-card-preview-modal__body">
          <div className="vmb-card-preview-modal__visual">
            <CardPreview model={draft} />
          </div>

          <div className="vmb-card-preview-modal__editor">
            <p className="vmb-card-preview-modal__editor-label">Edit card copy</p>

            <label className="vmb-card-preview-modal__field">
              <span>Greeting</span>
              <input
                value={draft.salutation}
                onChange={(e) => patchDraft({ salutation: e.target.value })}
                aria-label="Card greeting"
              />
            </label>

            <label className="vmb-card-preview-modal__field">
              <span>Title</span>
              <input
                value={draft.title}
                onChange={(e) => patchDraft({ title: e.target.value })}
                aria-label="Card title"
              />
            </label>

            <label className="vmb-card-preview-modal__field">
              <span>Subtitle</span>
              <input
                value={draft.subtitle}
                onChange={(e) => patchDraft({ subtitle: e.target.value })}
                aria-label="Card subtitle"
              />
            </label>

            <label className="vmb-card-preview-modal__field">
              <span>Body</span>
              <textarea
                value={draft.body}
                rows={4}
                onChange={(e) => patchDraft({ body: e.target.value })}
                aria-label="Card body"
              />
            </label>

            <label className="vmb-card-preview-modal__field">
              <span>Call to action</span>
              <input
                value={draft.cta}
                onChange={(e) => patchDraft({ cta: e.target.value })}
                aria-label="Call to action"
              />
            </label>

            <div className="vmb-card-preview-modal__edit-actions">
              <button type="button" className="taikos-opp-card__cta" onClick={handleSaveEdits}>
                Save Edits
              </button>
              <button
                type="button"
                className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
                onClick={handleCancelEdits}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {workflow.error ? (
          <p className="taikos-inline-workflow__error" role="alert">
            {workflow.error}
          </p>
        ) : null}

        {workflow.statusMessage && workflow.stage === "approved" ? (
          <p className="taikos-inline-workflow__message">{workflow.statusMessage}</p>
        ) : null}

        <footer className="vmb-card-preview-modal__footer">
          <button
            type="button"
            className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
            onClick={onClose}
          >
            Close
          </button>

          {workflow.stage === "previewed" ? (
            <button
              type="button"
              className="taikos-opp-card__cta"
              disabled={workflow.busy}
              onClick={() => void workflow.runApprove()}
            >
              {workflow.busy ? "Saving…" : "Approve"}
            </button>
          ) : null}

          {workflow.stage === "approved" && workflow.canQueue ? (
            <button
              type="button"
              className="taikos-opp-card__cta"
              disabled={workflow.busy}
              onClick={() => void workflow.runQueue()}
            >
              {workflow.busy ? "Queuing…" : "Add To Queue"}
            </button>
          ) : null}

          {workflow.stage === "approved" ? (
            <button
              type="button"
              className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
              onClick={workflow.skipQueue}
            >
              Skip
            </button>
          ) : null}

          {workflow.stage === "previewed" ? (
            <button
              type="button"
              className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
              disabled={workflow.busy}
              onClick={workflow.skipReject}
            >
              Skip
            </button>
          ) : null}
        </footer>

        {workflow.stage === "queued" ? (
          <p
            className="vmb-card-preview-modal__queued taikos-inline-workflow__message taikos-inline-workflow__message--success"
            role="status"
          >
            {workflow.statusMessage ?? "Added to queue. No message sent yet."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
