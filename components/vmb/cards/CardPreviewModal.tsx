"use client";

import { useEffect, useMemo } from "react";
import { CardPreview } from "@/components/vmb/cards/CardPreview";
import type { useInlineActionWorkflow } from "@/components/taikos/workflow/useInlineActionWorkflow";
import { isPersonalInviteCard } from "@/lib/vmb/cards/card-type-labels";
import { buildPersonalInviteCopy } from "@/lib/vmb/cards/personal-invite-copy";
import { useEditableCardDraft } from "@/lib/vmb/cards/use-editable-card-draft";
import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";

type Workflow = ReturnType<typeof useInlineActionWorkflow>;

type Props = {
  open: boolean;
  cardPreview: CardPreviewModel;
  displayName?: string;
  actionLabel?: string;
  workflow: Workflow;
  onClose: () => void;
};

function resolveInviteCopy(model: CardPreviewModel) {
  return (
    model.inviteCopy ??
    buildPersonalInviteCopy({
      recipientName: model.metadata.recipientName,
      serviceName: model.metadata.serviceName,
      lastVisit: model.metadata.lastVisit,
      ticketValue: model.metadata.ticketValue,
      techName: model.techName,
      salonName: model.salonDisplayName,
    })
  );
}

export function CardPreviewModal({
  open,
  cardPreview,
  displayName,
  actionLabel,
  workflow,
  onClose,
}: Props) {
  const { draft, patchDraft, snapshotDraft, restoreDraft } = useEditableCardDraft(cardPreview);
  const personalInvite = isPersonalInviteCard(draft.cardType);
  const inviteCopy = useMemo(() => resolveInviteCopy(draft), [draft]);
  const modalTitle =
    displayName && actionLabel ? `${displayName} — ${actionLabel}` : displayName ?? "Relationship card";

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
      aria-label={modalTitle}
      onClick={onClose}
    >
      <div className="vmb-card-preview-modal__panel" onClick={(e) => e.stopPropagation()}>
        <header className="vmb-card-preview-modal__header">
          <h2 className="vmb-card-preview-modal__title">{modalTitle}</h2>
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
            <CardPreview model={draft} variant={personalInvite ? "salon-invite" : "default"} />
          </div>

          <div className="vmb-card-preview-modal__editor">
            <p className="vmb-card-preview-modal__editor-label">
              {personalInvite ? "Edit Invite" : "Edit card copy"}
            </p>

            {personalInvite ? (
              <>
                <label className="vmb-card-preview-modal__field">
                  <span>Greeting</span>
                  <input
                    value={inviteCopy.greeting}
                    onChange={(e) => patchDraft({ inviteCopy: { greeting: e.target.value } })}
                    aria-label="Greeting"
                  />
                </label>

                <label className="vmb-card-preview-modal__field">
                  <span>Personal connection</span>
                  <textarea
                    value={inviteCopy.personalConnection}
                    rows={3}
                    onChange={(e) =>
                      patchDraft({ inviteCopy: { personalConnection: e.target.value } })
                    }
                    aria-label="Personal connection"
                  />
                </label>

                <label className="vmb-card-preview-modal__field">
                  <span>Invite message</span>
                  <textarea
                    value={inviteCopy.inviteMessage}
                    rows={4}
                    onChange={(e) => patchDraft({ inviteCopy: { inviteMessage: e.target.value } })}
                    aria-label="Invite message"
                  />
                </label>

                <label className="vmb-card-preview-modal__field">
                  <span>Offer / appointment note</span>
                  <textarea
                    value={inviteCopy.offerMessage}
                    rows={3}
                    onChange={(e) => patchDraft({ inviteCopy: { offerMessage: e.target.value } })}
                    aria-label="Offer or appointment note"
                  />
                </label>

                <label className="vmb-card-preview-modal__field">
                  <span>Signature</span>
                  <input
                    value={inviteCopy.signature}
                    onChange={(e) => patchDraft({ inviteCopy: { signature: e.target.value } })}
                    aria-label="Signature"
                  />
                </label>

                <label className="vmb-card-preview-modal__field">
                  <span>Primary CTA</span>
                  <input
                    value={inviteCopy.primaryCta}
                    onChange={(e) => patchDraft({ inviteCopy: { primaryCta: e.target.value } })}
                    aria-label="Primary call to action"
                  />
                </label>

                <label className="vmb-card-preview-modal__field">
                  <span>Secondary CTA</span>
                  <input
                    value={inviteCopy.secondaryCta}
                    onChange={(e) => patchDraft({ inviteCopy: { secondaryCta: e.target.value } })}
                    aria-label="Secondary call to action"
                  />
                </label>
              </>
            ) : (
              <>
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
              </>
            )}

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
          <p className="vmb-card-preview-modal__error taikos-inline-workflow__error" role="alert">
            {workflow.error}
          </p>
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
      </div>
    </div>
  );
}
