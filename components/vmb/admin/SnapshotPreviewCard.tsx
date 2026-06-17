"use client";

import { SalonInviteCard } from "@/components/vmb/invites/SalonInviteCard";
import {
  snapshotToSalonInviteCardProps,
  type InviteTemplateSnapshot,
} from "@/lib/vmb/invites/invite-template-snapshot";
import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";

type Props = {
  snapshot: InviteTemplateSnapshot | null;
  tokenContext?: InviteTemplateTokenContext;
  serviceFallbackById?: Record<string, string | undefined>;
  rewardFallbackById?: Record<string, string | undefined>;
  label?: string;
};

/** Renders a frozen invite snapshot — same payload used for library review and publish. */
export function SnapshotPreviewCard({
  snapshot,
  tokenContext,
  serviceFallbackById,
  rewardFallbackById,
  label = "Preview",
}: Props) {
  if (!snapshot) {
    return (
      <div className="vmb-admin-template-preview">
        <p className="vmb-admin-template-preview__label">{label}</p>
        <p className="vmb-admin-template-preview__empty">Select a template to preview.</p>
      </div>
    );
  }

  const cardProps = snapshotToSalonInviteCardProps(snapshot, {
    tokenContext,
    serviceFallbackById,
    rewardFallbackById,
  });

  return (
    <div className="vmb-admin-template-preview">
      <p className="vmb-admin-template-preview__label">{label}</p>
      <SalonInviteCard {...cardProps} mode="adminReview" />
    </div>
  );
}
