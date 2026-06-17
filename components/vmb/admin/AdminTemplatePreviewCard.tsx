"use client";

import { SalonInviteCard } from "@/components/vmb/invites/SalonInviteCard";
import type { NailTemplateDraft } from "@/lib/vmb/admin/nail-template-library";
import type { SalonInviteImageInserts } from "@/lib/vmb/invites/salon-invite-image-inserts";
import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";

type Props = {
  draft: NailTemplateDraft | null;
  serviceNames?: string[];
  rewardLabels?: string[];
  ownerName?: string;
  salonName?: string;
  imageInserts?: SalonInviteImageInserts;
  tokenContext?: InviteTemplateTokenContext;
};

/** Builder-side compact preview wrapper around SalonInviteCard. */
export function AdminTemplatePreviewCard({
  draft,
  serviceNames = [],
  rewardLabels = [],
  ownerName = "",
  salonName,
  imageInserts,
  tokenContext,
}: Props) {
  if (!draft) {
    return (
      <div className="vmb-admin-template-preview">
        <p className="vmb-admin-template-preview__label">Preview</p>
        <p className="vmb-admin-template-preview__empty">Select a template to preview.</p>
      </div>
    );
  }

  return (
    <div className="vmb-admin-template-preview">
      <p className="vmb-admin-template-preview__label">Preview</p>
      <SalonInviteCard
        inviteTypeLabel={draft.displayName}
        headline={draft.headline}
        body={draft.body}
        ctaLabel={draft.ctaLabel}
        services={serviceNames}
        rewards={rewardLabels}
        ownerName={ownerName}
        ownerPhotoUrl={imageInserts?.ownerPhotoUrl}
        salonName={salonName}
        salonLogoUrl={imageInserts?.salonLogoUrl}
        serviceImageUrl={imageInserts?.serviceImageUrl}
        mode="adminReview"
        tokenContext={tokenContext}
      />
    </div>
  );
}
