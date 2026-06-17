"use client";

import { SalonInviteCard, type SalonInviteCardProps } from "@/components/vmb/invites/SalonInviteCard";

type Props = Omit<SalonInviteCardProps, "mode"> & {
  open: boolean;
  onClose: () => void;
};

export function AdminSalonInviteReviewModal({ open, onClose, ...cardProps }: Props) {
  if (!open) return null;

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
