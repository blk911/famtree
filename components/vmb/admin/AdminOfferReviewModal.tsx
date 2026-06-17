"use client";

import { AdminOfferPreviewCard } from "@/components/vmb/admin/AdminOfferPreviewCard";
import type { VmbOffer } from "@/lib/vmb/offers/offer-types";

type Props = {
  open: boolean;
  offer: VmbOffer;
  serviceNames: string[];
  rewardLabels: string[];
  busy?: boolean;
  onClose: () => void;
  onSave: () => void;
};

export function AdminOfferReviewModal({
  open,
  offer,
  serviceNames,
  rewardLabels,
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
        aria-labelledby="admin-offer-review-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="vmb-admin-review-modal__header">
          <h2 id="admin-offer-review-title">Review Offer</h2>
          <button type="button" className="vmb-admin-review-modal__close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="vmb-admin-review-modal__body">
          <dl className="vmb-admin-offer-review__summary">
            <div>
              <dt>Offer name</dt>
              <dd>{offer.name}</dd>
            </div>
            <div>
              <dt>Value label</dt>
              <dd>{offer.valueLabel?.trim() || "—"}</dd>
            </div>
            <div className="vmb-admin-offer-review__summary-wide">
              <dt>Offer text</dt>
              <dd>{offer.offerText}</dd>
            </div>
            <div>
              <dt>Nail services</dt>
              <dd>{serviceNames.length > 0 ? serviceNames.join(", ") : "None selected"}</dd>
            </div>
            <div>
              <dt>Rewards included</dt>
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
            <div>
              <dt>Available to clients</dt>
              <dd>{offer.active ? "Yes" : "No"}</dd>
            </div>
          </dl>

          <AdminOfferPreviewCard
            offer={offer}
            serviceNames={serviceNames}
            addonLabels={rewardLabels}
          />
        </div>

        <footer className="vmb-admin-review-modal__footer">
          <button
            type="button"
            className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
            disabled={busy}
            onClick={onClose}
          >
            Back to Edit
          </button>
          <button type="button" className="taikos-opp-card__cta" disabled={busy} onClick={onSave}>
            {busy ? "Saving…" : "Save to Offer Catalog"}
          </button>
        </footer>
      </div>
    </div>
  );
}

export const OFFER_CATALOG_SAVED_MESSAGE =
  "Saved to Offer Catalog. This offer can now be used in Invite Builder.";
