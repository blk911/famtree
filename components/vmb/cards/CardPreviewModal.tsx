"use client";



import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { CardPreview } from "@/components/vmb/cards/CardPreview";

import type { useInlineActionWorkflow } from "@/components/taikos/workflow/useInlineActionWorkflow";

import { isPersonalInviteCard } from "@/lib/vmb/cards/card-type-labels";

import { buildPersonalInviteCopy } from "@/lib/vmb/cards/personal-invite-copy";
import { cardPreviewToQueuedInvitePayload } from "@/lib/vmb/cards/queued-invite-card-payload";

import { useEditableCardDraft } from "@/lib/vmb/cards/use-editable-card-draft";

import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";
import { buildPreviewFromTemplate, cardPreviewToTemplateOverride } from "@/lib/vmb/card-templates/apply-card-template";
import type { VmbCardTemplate } from "@/lib/vmb/card-templates/card-template-types";
import { getDefaultTemplate } from "@/lib/vmb/card-templates/default-card-templates";
import { toCardPreviewOffer } from "@/lib/vmb/offers/offer-resolver";
import type { VmbOffer } from "@/lib/vmb/offers/offer-types";



type Workflow = ReturnType<typeof useInlineActionWorkflow>;



type Props = {

  open: boolean;

  cardPreview: CardPreviewModel;

  displayName?: string;

  actionLabel?: string;

  workflow: Workflow;

  onClose: () => void;

  salonId?: string;

  templateInput?: import("@/lib/vmb/cards/card-preview-model").CardTemplateInput;

  templateBaseline?: CardPreviewModel;

  salonOffers?: VmbOffer[];

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

  salonId,

  templateInput,

  templateBaseline,

  salonOffers = [],

}: Props) {

  const { draft, patchDraft, snapshotDraft, restoreDraft, replaceDraft } = useEditableCardDraft(cardPreview);

  const personalInvite = isPersonalInviteCard(draft.cardType);

  const inviteCopy = useMemo(() => resolveInviteCopy(draft), [draft]);

  const [templateBusy, setTemplateBusy] = useState(false);

  const [templateMessage, setTemplateMessage] = useState<string | null>(null);

  const templateMeta = useMemo(
    () => getDefaultTemplate(draft.cardType),
    [draft.cardType],
  );

  const categoryOffers = useMemo(() => {
    const category = templateMeta.offerCategory;
    if (!category) return salonOffers;
    return salonOffers.filter((offer) => offer.category === category && offer.active);
  }, [salonOffers, templateMeta.offerCategory]);

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



  function handleResetToTemplate() {

    if (templateBaseline) {

      replaceDraft(templateBaseline);

      setTemplateMessage("Restored from template.");

      return;

    }

    if (!salonId || !templateInput) {

      restoreDraft();

      return;

    }

    setTemplateBusy(true);

    setTemplateMessage(null);

    void fetch(`/api/vmb/card-templates?type=${draft.cardType}`)

      .then((res) => res.json())

      .then((data: { ok?: boolean; template?: VmbCardTemplate; error?: string }) => {

        if (!data.ok || !data.template) {

          setTemplateMessage(data.error ?? "Could not load template.");

          return;

        }

        replaceDraft(buildPreviewFromTemplate(data.template, templateInput, templateInput.techName));

        setTemplateMessage("Restored from template.");

      })

      .finally(() => setTemplateBusy(false));

  }



  function handleSaveAsTemplateDefault() {

    if (!salonId) {

      setTemplateMessage("Sign in to save salon template defaults.");

      return;

    }

    setTemplateBusy(true);

    setTemplateMessage(null);

    void fetch(`/api/vmb/card-templates?type=${draft.cardType}`)

      .then((res) => res.json())

      .then(async (data: { ok?: boolean; template?: VmbCardTemplate; error?: string }) => {

        if (!data.ok || !data.template) {

          setTemplateMessage(data.error ?? "Could not load base template.");

          return;

        }

        const override = cardPreviewToTemplateOverride(draft, data.template);

        const saveRes = await fetch("/api/vmb/card-templates", {

          method: "PUT",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({ template: override }),

        });

        const saved = (await saveRes.json()) as { ok?: boolean; error?: string };

        setTemplateMessage(saved.ok ? "Saved as template default." : saved.error ?? "Save failed.");

      })

      .finally(() => setTemplateBusy(false));

  }

  function handleApprove() {
    snapshotDraft();
    const inviteCard = personalInvite
      ? cardPreviewToQueuedInvitePayload(
          draft,
          displayName?.trim() || draft.metadata.recipientName?.trim() || "Client",
          actionLabel?.trim() || "Private Client Invite",
        )
      : undefined;
    void workflow.runApprove(inviteCard);
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

            {draft.templateName ? (
              <p className="vmb-card-preview-modal__template-indicator">
                Template: {draft.templateName}
              </p>
            ) : null}

            <p className="vmb-card-preview-modal__editor-label">

              {personalInvite ? "Edit Invite" : "Edit card copy"}

            </p>



            {personalInvite ? (

              <>

                <label className="vmb-card-preview-modal__field">

                  <span>Personal Connection</span>

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

                  <span>Relationship Benefit</span>

                  <textarea

                    value={inviteCopy.inviteMessage}

                    rows={4}

                    onChange={(e) => patchDraft({ inviteCopy: { inviteMessage: e.target.value } })}

                    aria-label="Relationship benefit"

                  />

                </label>



                <label className="vmb-card-preview-modal__field">

                  <span>Offer</span>

                  <textarea

                    value={inviteCopy.offerMessage}

                    rows={3}

                    onChange={(e) => patchDraft({ inviteCopy: { offerMessage: e.target.value } })}

                    aria-label="Offer"

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

              </>

            ) : (

              <>

                <label className="vmb-card-preview-modal__field">

                  <span>Personal Connection</span>

                  <textarea

                    value={draft.body}

                    rows={3}

                    onChange={(e) => patchDraft({ body: e.target.value })}

                    aria-label="Personal connection"

                  />

                </label>



                <label className="vmb-card-preview-modal__field">

                  <span>Relationship Benefit</span>

                  <textarea

                    value={draft.relationshipBenefit ?? ""}

                    rows={3}

                    onChange={(e) => patchDraft({ relationshipBenefit: e.target.value })}

                    aria-label="Relationship benefit"

                  />

                </label>



                <label className="vmb-card-preview-modal__field">

                  <span>Offer</span>

                  <textarea

                    value={draft.templateOfferLine ?? draft.offer?.offerText ?? ""}

                    rows={2}

                    onChange={(e) => patchDraft({ templateOfferLine: e.target.value })}

                    aria-label="Offer"

                  />

                </label>



                <label className="vmb-card-preview-modal__field">

                  <span>Signature</span>

                  <input

                    value={draft.signatureLine ?? ""}

                    onChange={(e) => patchDraft({ signatureLine: e.target.value })}

                    aria-label="Signature"

                  />

                </label>

              </>

            )}



            {templateMeta.offerMode && templateMeta.offerMode !== "none" ? (
              <div className="vmb-card-preview-modal__offer-section">
                <p className="vmb-card-preview-modal__editor-label">Offer</p>

                <label className="vmb-card-preview-modal__field vmb-offer-admin__checkbox">
                  <input
                    type="checkbox"
                    checked={draft.includeOffer !== false && Boolean(draft.offer)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const fallback = categoryOffers[0];
                        if (fallback) {
                          patchDraft({ includeOffer: true, offer: toCardPreviewOffer(fallback) });
                        }
                      } else {
                        patchDraft({ includeOffer: false });
                      }
                    }}
                  />
                  <span>Include offer</span>
                </label>

                {categoryOffers.length > 0 ? (
                  <label className="vmb-card-preview-modal__field">
                    <span>Select offer</span>
                    <select
                      value={draft.offer?.id ?? ""}
                      onChange={(e) => {
                        const selected = categoryOffers.find((offer) => offer.id === e.target.value);
                        if (selected) {
                          patchDraft({ includeOffer: true, offer: toCardPreviewOffer(selected) });
                        }
                      }}
                    >
                      {categoryOffers.map((offer) => (
                        <option key={offer.id} value={offer.id}>
                          {offer.name}
                          {offer.valueLabel ? ` — ${offer.valueLabel}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {draft.offer ? (
                  <label className="vmb-card-preview-modal__field">
                    <span>Offer text (this card only)</span>
                    <textarea
                      rows={3}
                      value={draft.offer.offerText}
                      onChange={(e) => patchDraft({ offer: { offerText: e.target.value } })}
                    />
                  </label>
                ) : null}

                <Link href="/admin/invites/library" className="vmb-card-preview-modal__manage-offers">
                  Manage Offers
                </Link>
              </div>
            ) : null}



            <div className="vmb-card-preview-modal__edit-actions">

              <button type="button" className="taikos-opp-card__cta" onClick={handleSaveEdits}>

                Save Edits

              </button>

              <button

                type="button"

                className="taikos-opp-card__cta taikos-opp-card__cta--ghost"

                onClick={handleResetToTemplate}

                disabled={templateBusy}

              >

                Reset to Template

              </button>

              {salonId ? (
                <button
                  type="button"
                  className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
                  onClick={handleSaveAsTemplateDefault}
                  disabled={templateBusy}
                >
                  Save as Template Default
                </button>
              ) : null}

              <button

                type="button"

                className="taikos-opp-card__cta taikos-opp-card__cta--ghost"

                onClick={restoreDraft}

              >

                Undo Edits

              </button>

            </div>

            {templateMessage ? (
              <p className="vmb-card-preview-modal__template-status">{templateMessage}</p>
            ) : null}

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

              onClick={handleApprove}

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


