"use client";

import { SalonInviteCard } from "@/components/vmb/invites/SalonInviteCard";
import type { NailTemplateDraft } from "@/lib/vmb/admin/nail-template-library";
import type { SalonInviteImageInserts } from "@/lib/vmb/invites/salon-invite-image-inserts";
import { INVITE_TEMPLATE_PREVIEW_CONTEXT } from "@/lib/vmb/invite-templates/invite-template-tokens";
import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";

type Props = {
  open: boolean;
  draft: NailTemplateDraft;
  serviceNames: string[];
  rewardLabels: string[];
  ownerName?: string;
  salonName?: string;
  imageInserts?: SalonInviteImageInserts;
  tokenContext?: InviteTemplateTokenContext;
  busy?: boolean;
  onClose: () => void;
  onSave: () => void;
};

export function AdminTemplateReviewModal({
  open,
  draft,
  serviceNames,
  rewardLabels,
  ownerName,
  salonName,
  imageInserts,
  tokenContext,
  busy = false,
  onClose,
  onSave,
}: Props) {
  if (!open) return null;

  return (
    <div className="vmb-admin-review-modal" role="presentation" onClick={onClose}>
      <div
        className="vmb-admin-review-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-template-review-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="vmb-admin-review-modal__header">
          <h2 id="admin-template-review-title">Template Review</h2>
          <button type="button" className="vmb-admin-review-modal__close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="vmb-admin-review-modal__body">
          <dl className="vmb-admin-offer-review__summary">
            <div>
              <dt>Template type</dt>
              <dd>{draft.displayName}</dd>
            </div>
            <div>
              <dt>Available to clients</dt>
              <dd>{draft.active ? "Yes" : "No"}</dd>
            </div>
            <div className="vmb-admin-offer-review__summary-wide">
              <dt>Headline</dt>
              <dd>{draft.headline}</dd>
            </div>
            <div className="vmb-admin-offer-review__summary-wide">
              <dt>Body</dt>
              <dd>{draft.body}</dd>
            </div>
            <div>
              <dt>CTA</dt>
              <dd>{draft.ctaLabel}</dd>
            </div>
            <div>
              <dt>Selected services</dt>
              <dd>{serviceNames.length > 0 ? serviceNames.join(", ") : "None selected"}</dd>
            </div>
            <div className="vmb-admin-offer-review__summary-wide">
              <dt>Selected rewards</dt>
              <dd>
                {rewardLabels.length > 0 ? (
                  <ul className="vmb-admin-offer-preview__chips">
                    {rewardLabels.map((label) => (
                      <li key={label}>
                        <span className="vmb-admin-offer-preview__chip">{label}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  "None selected"
                )}
              </dd>
            </div>
          </dl>

          <SalonInviteCard
            inviteTypeLabel={draft.displayName}
            headline={draft.headline}
            body={draft.body}
            ctaLabel={draft.ctaLabel}
            services={serviceNames}
            rewards={rewardLabels}
            ownerName={ownerName || INVITE_TEMPLATE_PREVIEW_CONTEXT.providerName}
            salonName={salonName}
            ownerPhotoUrl={imageInserts?.ownerPhotoUrl}
            salonLogoUrl={imageInserts?.salonLogoUrl}
            serviceImageUrl={imageInserts?.serviceImageUrl}
            mode="adminReview"
            tokenContext={tokenContext}
          />
        </div>

        <footer className="vmb-admin-review-modal__footer">
          <button
            type="button"
            className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
            disabled={busy}
            onClick={onClose}
          >
            Back To Edit
          </button>
          <button type="button" className="taikos-opp-card__cta" disabled={busy} onClick={onSave}>
            {busy ? "Saving…" : "Save To Library"}
          </button>
        </footer>
      </div>
    </div>
  );
}
