import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";
import type { RecipientInvitePageState } from "./recipient-invite-view";
import { toRecipientInvitePageState } from "./recipient-invite-view";
import { getSentInviteByToken } from "./sent-invite-store";
import type { SentInvite } from "./sent-invite-types";

export type ResolvedRecipientInvite = RecipientInvitePageState & {
  sentInvite?: SentInvite;
};

function previewModel(invite: SentInvite): CardPreviewModel {
  const snapshot = invite.snapshot;
  return {
    cardType: "refresh_card",
    salutation: `For ${snapshot.recipientName}`,
    title: snapshot.headline,
    subtitle: snapshot.inviteTypeLabel,
    body: snapshot.body,
    imageLayout: "single",
    imageSlots: snapshot.inviteArtImageUrl || snapshot.serviceImageUrl
      ? [{ id: "hero", label: snapshot.inviteTypeLabel, previewUrl: snapshot.inviteArtImageUrl ?? snapshot.serviceImageUrl, role: "service" }]
      : [],
    accent: "rose",
    cta: snapshot.ctaLabel,
    tags: [...snapshot.services, ...snapshot.rewards],
    metadata: { recipientName: snapshot.recipientName },
    relationshipBenefit: snapshot.termsText,
    templateOfferLine: snapshot.priceLabel,
    techName: snapshot.providerName,
    salonDisplayName: snapshot.salonDisplayName,
  };
}

export async function resolveRecipientInvite(token: string): Promise<ResolvedRecipientInvite> {
  const trimmed = token.trim();
  if (!trimmed) return { status: "not_found", inviteId: trimmed };
  const sentInvite = await getSentInviteByToken(trimmed);
  if (!sentInvite) return { status: "not_found", inviteId: trimmed };
  if (new Date(sentInvite.expiresAt) <= new Date() || sentInvite.status === "expired") {
    return { status: "expired", inviteId: trimmed, message: "This invite has expired.", sentInvite };
  }
  if (sentInvite.status === "cancelled" || sentInvite.status === "redeemed") {
    return {
      status: "expired",
      inviteId: trimmed,
      message: sentInvite.status === "redeemed" ? "This invite has already been redeemed." : "This invite has been cancelled.",
      sentInvite,
    };
  }
  const state = toRecipientInvitePageState({
    inviteId: trimmed,
    salonDisplayName: sentInvite.snapshot.salonDisplayName,
    techName: sentInvite.snapshot.providerName,
    previewModel: previewModel(sentInvite),
    primaryCta: sentInvite.snapshot.ctaLabel,
  });
  return { ...state, sentInvite };
}
