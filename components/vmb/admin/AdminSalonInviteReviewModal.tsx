"use client";

import { SalonInviteCard } from "@/components/vmb/invites/SalonInviteCard";
import {
  snapshotToSalonInviteCardProps,
  type InviteTemplateSnapshot,
} from "@/lib/vmb/invites/invite-template-snapshot";
import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";

type Props = {
  open: boolean;
  onClose: () => void;
  snapshot: InviteTemplateSnapshot;
  tokenContext?: InviteTemplateTokenContext;
  serviceFallbackById?: Record<string, string | undefined>;
  rewardFallbackById?: Record<string, string | undefined>;
};

export function AdminSalonInviteReviewModal({
  open,
  onClose,
  snapshot,
  tokenContext,
  serviceFallbackById,
  rewardFallbackById,
}: Props) {
  if (!open) return null;

  const cardProps = snapshotToSalonInviteCardProps(snapshot, {
    tokenContext,
    serviceFallbackById,
    rewardFallbackById,
  });

  return (
    <div className="vmb-admin-salon-invite-review-modal" role="presentation" onClick={onClose}>
      <div
        className="vmb-admin-salon-invite-review-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-salon-invite-review-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="vmb-admin-salon-invite-review-modal__header">
          <h2 id="admin-salon-invite-review-title">Final Salon Invite Preview</h2>
          <button type="button" className="vmb-admin-salon-invite-review-modal__close" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="vmb-admin-salon-invite-review-modal__body">
          <SalonInviteCard {...cardProps} mode="adminReview" />
        </div>
      </div>
    </div>
  );
}
