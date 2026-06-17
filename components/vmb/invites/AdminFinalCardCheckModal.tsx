"use client";

import { AdminNailInviteCard, type AdminNailInviteCardProps } from "@/components/vmb/invites/AdminNailInviteCard";

type Props = AdminNailInviteCardProps & {
  open: boolean;
  onClose: () => void;
};

export function AdminFinalCardCheckModal({ open, onClose, template, tokenContext, offer }: Props) {
  if (!open) return null;

  return (
    <div className="vmb-admin-final-card-modal" role="presentation" onClick={onClose}>
      <div
        className="vmb-admin-final-card-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-final-card-check-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="vmb-admin-final-card-modal__header">
          <h2 id="admin-final-card-check-title">Admin Final Card Check</h2>
          <button type="button" className="vmb-admin-final-card-modal__close" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="vmb-admin-final-card-modal__body">
          <AdminNailInviteCard
            key={template.id}
            template={template}
            tokenContext={tokenContext}
            offer={offer}
          />
        </div>
      </div>
    </div>
  );
}
