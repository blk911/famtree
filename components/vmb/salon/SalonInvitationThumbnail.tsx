"use client";

import { SalonInviteCard } from "@/components/vmb/invites/SalonInviteCard";
import {
  snapshotToSalonInviteCardProps,
  type InviteTemplateSnapshot,
} from "@/lib/vmb/invites/invite-template-snapshot";
import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";

type Props = {
  snapshot: InviteTemplateSnapshot;
  tokenContext?: InviteTemplateTokenContext;
  serviceFallbackById?: Record<string, string | undefined>;
  rewardFallbackById?: Record<string, string | undefined>;
};

/** Scaled salon invite card preview — same renderer as the preview modal. */
export function SalonInvitationThumbnail({
  snapshot,
  tokenContext,
  serviceFallbackById,
  rewardFallbackById,
}: Props) {
  const cardProps = snapshotToSalonInviteCardProps(snapshot, {
    tokenContext,
    serviceFallbackById,
    rewardFallbackById,
  });

  return (
    <div className="vmb-salon-invite-thumbnail" aria-hidden>
      <div className="vmb-salon-invite-thumbnail__frame">
        <SalonInviteCard {...cardProps} mode="salon" />
      </div>
    </div>
  );
}
