"use client";

import { SalonInviteCard } from "@/components/vmb/invites/SalonInviteCard";
import {
  snapshotToSalonInviteCardProps,
  type InviteTemplateSnapshot,
} from "@/lib/vmb/invites/invite-template-snapshot";
import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  open: boolean;
  onClose: () => void;
  snapshot: InviteTemplateSnapshot;
  tokenContext?: InviteTemplateTokenContext;
  serviceFallbackById?: Record<string, string | undefined>;
  rewardFallbackById?: Record<string, string | undefined>;
};

export function SalonInvitationPreviewModal({
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
    <div
      className="vmb-admin-salon-invite-review-modal"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="vmb-admin-salon-invite-review-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="salon-invitation-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="vmb-admin-salon-invite-review-modal__header">
          <h2 id="salon-invitation-preview-title">Invitation Preview</h2>
          <button type="button" className="vmb-admin-salon-invite-review-modal__close" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="vmb-admin-salon-invite-review-modal__body">
          <p style={{ margin: "0 0 12px", fontSize: 13, color: VMB_THEME.muted }}>
            Published from VMB master library — preview only.
          </p>
          <SalonInviteCard {...cardProps} mode="salon" />
        </div>
      </div>
    </div>
  );
}
