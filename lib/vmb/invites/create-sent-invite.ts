import { getSalonInvitationApproval, updateSalonInvitationApprovalStatus } from "./salon-invitation-approval-store";
import { getSalonInviteLocalCopy } from "./salon-invite-local-copy-store";
import { isSalonInviteMatchingActive } from "./salon-invite-inventory";
import { resolveSnapshotRewardLabels, resolveSnapshotServiceLabels, snapshotToSalonInviteCardProps } from "./invite-template-snapshot";
import { createSentInvite } from "./sent-invite-store";
import type { SentInvitePublicSnapshot } from "./sent-invite-types";
import { getSalonOfferCatalogEntry } from "@/lib/vmb/salon-offers/salon-offer-catalog-store";
import { getActiveSalonServiceIds } from "@/lib/vmb/services/salon-service-config-store";

const DEFAULT_LIFETIME_DAYS = 30;

export async function sendApprovedInvitation(input: {
  salonId: string;
  approvalId: string;
  expiresAt?: string;
}) {
  const approval = await getSalonInvitationApproval(input.salonId, input.approvalId);
  if (!approval) return { error: "Approved invitation not found", status: 404 } as const;
  if (approval.status !== "approved") return { error: "Only approved invitations can be sent", status: 409 } as const;

  const copy = await getSalonInviteLocalCopy(input.salonId, approval.sourceCopyId);
  if (!copy || copy.salonId !== input.salonId || copy.sourceTemplateId !== approval.sourceTemplateId || !isSalonInviteMatchingActive(copy)) {
    return { error: "The invitation touchpoint is paused or unavailable", status: 409 } as const;
  }

  const activeServiceIds = new Set(await getActiveSalonServiceIds(input.salonId));
  if (approval.snapshot.serviceIds.some((serviceId) => !activeServiceIds.has(serviceId))) {
    return { error: "One or more linked services are no longer active for this salon", status: 409 } as const;
  }

  if (approval.salonOfferCatalogId) {
    const offer = await getSalonOfferCatalogEntry(input.salonId, approval.salonOfferCatalogId);
    if (!offer || offer.salonId !== input.salonId || !offer.active) {
      return { error: "The linked offer is unpublished, inactive, or unavailable", status: 409 } as const;
    }
    if (!activeServiceIds.has(offer.serviceId)) {
      return { error: "The linked offer service is no longer active for this salon", status: 409 } as const;
    }
  }

  const expiresAt = input.expiresAt?.trim()
    ? new Date(input.expiresAt)
    : new Date(Date.now() + DEFAULT_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    return { error: "Expiration must be in the future", status: 400 } as const;
  }

  const card = snapshotToSalonInviteCardProps(approval.snapshot, {
    tokenContext: {
      clientName: approval.clientName,
      salonName: approval.snapshot.salonName ?? "Your Salon",
      providerName: approval.snapshot.ownerName ?? "Your stylist",
    },
  });
  const publicSnapshot: SentInvitePublicSnapshot = {
    salonDisplayName: approval.snapshot.salonName?.trim() || "Your Salon",
    providerName: approval.snapshot.ownerName?.trim() || undefined,
    recipientName: approval.clientName,
    inviteTypeLabel: approval.snapshot.templateName,
    headline: card.headline,
    body: card.body,
    ctaLabel: card.ctaLabel,
    services: resolveSnapshotServiceLabels(approval.snapshot),
    rewards: resolveSnapshotRewardLabels(approval.snapshot),
    expirationLabel: approval.snapshot.expirationLabel,
    termsText: approval.snapshot.termsText,
    priceLabel: approval.snapshot.priceLabel,
    ownerPhotoUrl: card.ownerPhotoUrl,
    salonLogoUrl: card.salonLogoUrl,
    serviceImageUrl: card.serviceImageUrl,
    inviteArtImageUrl: card.inviteArtImageUrl,
  };

  const created = await createSentInvite({
    salonId: input.salonId,
    sourceApprovalId: approval.id,
    sourceCopyId: approval.sourceCopyId,
    snapshot: publicSnapshot,
    expiresAt: expiresAt.toISOString(),
  });
  if ("error" in created) return created;

  const updated = await updateSalonInvitationApprovalStatus(input.salonId, approval.id, "sent");
  if ("error" in updated) {
    return { error: "Invite was created but approval status could not be updated", status: 503 } as const;
  }
  return created;
}
