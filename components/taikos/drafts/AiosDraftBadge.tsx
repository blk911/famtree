"use client";

import { draftStatusLabel } from "@/lib/taikos/drafts/draft-status";
import type { TaikosDraftStatus, TaikosDraftType } from "@/lib/taikos/drafts/types";

const TYPE_LABELS: Record<TaikosDraftType, string> = {
  pcn_invite: "PCN Invite",
  campaign: "Campaign",
  service_card: "Service Card",
  referral_ask: "Referral",
  reactivation: "Reactivation",
  calendar_gap: "Calendar",
};

type Props = {
  draftType?: TaikosDraftType;
  status?: TaikosDraftStatus;
};

export function AiosDraftBadge({ draftType, status }: Props) {
  return (
    <span className="aios-draft-badges">
      {draftType ? (
        <span className="aios-draft-badge aios-draft-badge--type">{TYPE_LABELS[draftType]}</span>
      ) : null}
      {status ? (
        <span className="aios-draft-badge aios-draft-badge--status">{draftStatusLabel(status)}</span>
      ) : null}
    </span>
  );
}
