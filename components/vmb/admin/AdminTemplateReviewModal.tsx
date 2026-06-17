"use client";

import { SalonInviteCard } from "@/components/vmb/invites/SalonInviteCard";
import {
  resolveSnapshotRewardLabels,
  resolveSnapshotServiceLabels,
  snapshotToSalonInviteCardProps,
  type InviteTemplateSnapshot,
} from "@/lib/vmb/invites/invite-template-snapshot";
import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";

type Props = {
  open: boolean;
  snapshot: InviteTemplateSnapshot;
  tokenContext?: InviteTemplateTokenContext;
  serviceFallbackById?: Record<string, string | undefined>;
  rewardFallbackById?: Record<string, string | undefined>;
  active?: boolean;
  busy?: boolean;
  onClose: () => void;
  onSave: () => void;
};

export function AdminTemplateReviewModal({
  open,
  snapshot,
  tokenContext,
  serviceFallbackById,
  rewardFallbackById,
  active = true,
  busy = false,
  onClose,
  onSave,
}: Props) {
  if (!open) return null;

  const serviceNames = resolveSnapshotServiceLabels(snapshot, serviceFallbackById);
  const rewardLabels = resolveSnapshotRewardLabels(snapshot, rewardFallbackById);
  const cardProps = snapshotToSalonInviteCardProps(snapshot, {
    tokenContext,
    serviceFallbackById,
    rewardFallbackById,
  });

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
              <dd>{snapshot.templateName}</dd>
            </div>
            <div>
              <dt>Available to clients</dt>
              <dd>{active ? "Yes" : "No"}</dd>
            </div>
            <div className="vmb-admin-offer-review__summary-wide">
              <dt>Headline</dt>
              <dd>{snapshot.headline}</dd>
            </div>
            <div className="vmb-admin-offer-review__summary-wide">
              <dt>Body</dt>
              <dd>{snapshot.body}</dd>
            </div>
            <div>
              <dt>CTA</dt>
              <dd>{snapshot.ctaLabel}</dd>
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

          <SalonInviteCard {...cardProps} mode="adminReview" />
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
