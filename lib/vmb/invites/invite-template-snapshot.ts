import type { NailTemplateDraft } from "@/lib/vmb/admin/nail-template-library";
import {
  resolveNailOfferAddonLabels,
  resolveNailOfferServiceLabels,
} from "@/lib/vmb/admin/nail-offer-builder-selections";
import { getInviteArtImage } from "@/lib/vmb/assets/invite-art-resolver";
import { resolveInviteServiceImageUrl } from "@/lib/vmb/assets/service-image-resolver";
import type { SalonInviteCardProps } from "@/components/vmb/invites/SalonInviteCard";
import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";
import type { VmbOffer } from "@/lib/vmb/offers/offer-types";

export type InviteTemplateSnapshotStatus = "draft" | "library" | "published";

export type InviteTemplateSnapshot = {
  id: string;
  sourceTemplateId: string;
  templateName: string;
  categoryId: string;
  headline: string;
  body: string;
  ctaLabel: string;
  serviceIds: string[];
  rewardIds: string[];
  ownerPhotoUrl?: string;
  salonLogoUrl?: string;
  serviceImageUrl?: string;
  inviteArtImageUrl?: string;
  lockedInviteArtAssetId?: string;
  selectedInviteArtUrl?: string;
  priceLabel?: string;
  expirationLabel?: string;
  termsText?: string;
  totalValue?: number;
  savingsAmount?: number;
  offerPrice?: number;
  valueLabel?: string;
  ownerName?: string;
  salonName?: string;
  status: InviteTemplateSnapshotStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type BuildInviteTemplateSnapshotInput = {
  draft: NailTemplateDraft;
  ownerName?: string;
  salonName?: string;
  ownerPhotoUrl?: string;
  salonLogoUrl?: string;
  serviceImageUrl?: string;
  inviteArtImageUrl?: string;
  lockedInviteArtAssetId?: string;
  selectedInviteArtUrl?: string;
  priceLabel?: string;
  expirationLabel?: string;
  termsText?: string;
  totalValue?: number;
  savingsAmount?: number;
  offerPrice?: number;
  valueLabel?: string;
  status?: InviteTemplateSnapshotStatus;
  version?: number;
  previousSnapshot?: InviteTemplateSnapshot | null;
  serviceFallbackById?: Record<string, string | undefined>;
  rewardFallbackById?: Record<string, string | undefined>;
};

function snapshotStorageId(sourceTemplateId: string, version: number): string {
  return `${sourceTemplateId}-v${version}`;
}

export function buildInviteTemplateSnapshot(
  input: BuildInviteTemplateSnapshotInput,
): InviteTemplateSnapshot {
  const now = new Date().toISOString();
  const version =
    input.version ??
    (input.previousSnapshot ? input.previousSnapshot.version + 1 : input.draft.saved ? 1 : 0);
  const status =
    input.status ?? (input.draft.saved ? "library" : version > 0 ? "library" : "draft");

  return {
    id: snapshotStorageId(input.draft.templateId, version),
    sourceTemplateId: input.draft.templateId,
    templateName: input.draft.displayName,
    categoryId: "nails",
    headline: input.draft.headline,
    body: input.draft.body,
    ctaLabel: input.draft.ctaLabel,
    serviceIds: [...input.draft.serviceIds],
    rewardIds: [...input.draft.serviceOptionIds],
    ownerPhotoUrl: input.ownerPhotoUrl,
    salonLogoUrl: input.salonLogoUrl,
    serviceImageUrl: input.serviceImageUrl,
    inviteArtImageUrl: input.inviteArtImageUrl,
    lockedInviteArtAssetId: input.lockedInviteArtAssetId,
    selectedInviteArtUrl: input.selectedInviteArtUrl,
    priceLabel: input.priceLabel,
    expirationLabel: input.expirationLabel,
    termsText: input.termsText,
    totalValue: input.totalValue,
    savingsAmount: input.savingsAmount,
    offerPrice: input.offerPrice,
    valueLabel: input.valueLabel,
    ownerName: input.ownerName,
    salonName: input.salonName,
    status,
    version,
    createdAt: input.previousSnapshot?.createdAt ?? now,
    updatedAt: now,
  };
}

export function parseInviteTemplateSnapshot(raw: unknown): InviteTemplateSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as InviteTemplateSnapshot;
  if (
    typeof row.id !== "string" ||
    typeof row.sourceTemplateId !== "string" ||
    typeof row.headline !== "string" ||
    typeof row.body !== "string" ||
    typeof row.ctaLabel !== "string"
  ) {
    return null;
  }
  return {
    ...row,
    serviceIds: Array.isArray(row.serviceIds) ? [...row.serviceIds] : [],
    rewardIds: Array.isArray(row.rewardIds) ? [...row.rewardIds] : [],
  };
}

export function inviteTemplateSnapshotFromOffer(
  offer: VmbOffer,
  templateName: string,
  options: {
    ownerName?: string;
    salonName?: string;
    serviceFallbackById?: Record<string, string | undefined>;
    rewardFallbackById?: Record<string, string | undefined>;
  } = {},
): InviteTemplateSnapshot {
  const embedded = parseInviteTemplateSnapshot((offer as VmbOffer & { inviteSnapshot?: unknown }).inviteSnapshot);
  if (embedded) return embedded;

  const now = offer.updatedAt || new Date().toISOString();
  return {
    id: snapshotStorageId(offer.templateId ?? offer.id, 1),
    sourceTemplateId: offer.templateId ?? offer.id,
    templateName,
    categoryId: "nails",
    headline: offer.headline ?? templateName,
    body: offer.body ?? offer.offerText,
    ctaLabel: offer.ctaLabel ?? "View Offer",
    serviceIds: offer.serviceIds ? [...offer.serviceIds] : [],
    rewardIds: offer.serviceOptionIds ? [...offer.serviceOptionIds] : [],
    priceLabel: offer.valueLabel,
    termsText: offer.terms,
    ownerName: options.ownerName,
    salonName: options.salonName,
    status: "library",
    version: 1,
    createdAt: offer.createdAt ?? now,
    updatedAt: now,
  };
}

export function resolveSnapshotServiceLabels(
  snapshot: InviteTemplateSnapshot,
  fallbackById: Record<string, string | undefined> = {},
): string[] {
  return resolveNailOfferServiceLabels(snapshot.serviceIds, fallbackById);
}

export function resolveSnapshotRewardLabels(
  snapshot: InviteTemplateSnapshot,
  fallbackById: Record<string, string | undefined> = {},
): string[] {
  return resolveNailOfferAddonLabels(snapshot.rewardIds, fallbackById);
}

export function snapshotToSalonInviteCardProps(
  snapshot: InviteTemplateSnapshot,
  options: {
    mode?: SalonInviteCardProps["mode"];
    tokenContext?: InviteTemplateTokenContext;
    serviceFallbackById?: Record<string, string | undefined>;
    rewardFallbackById?: Record<string, string | undefined>;
    salonId?: string;
  } = {},
): Omit<SalonInviteCardProps, "mode"> {
  const services = resolveSnapshotServiceLabels(snapshot, options.serviceFallbackById);
  const inviteArt = getInviteArtImage({
    templateType: snapshot.sourceTemplateId || snapshot.templateName,
    invitationType: snapshot.templateName,
    serviceName: services[0],
    salonId: options.salonId,
    inviteId: snapshot.id,
    lockedInviteArtAssetId: snapshot.lockedInviteArtAssetId,
    selectedInviteArtUrl: snapshot.selectedInviteArtUrl ?? snapshot.inviteArtImageUrl,
  });

  return {
    inviteTypeLabel: snapshot.templateName,
    headline: snapshot.headline,
    body: snapshot.body,
    ctaLabel: snapshot.ctaLabel,
    services,
    rewards: resolveSnapshotRewardLabels(snapshot, options.rewardFallbackById),
    expirationLabel: snapshot.expirationLabel,
    ownerName: snapshot.ownerName ?? "Your nail tech",
    ownerPhotoUrl: snapshot.ownerPhotoUrl,
    salonName: snapshot.salonName,
    salonLogoUrl: snapshot.salonLogoUrl,
    serviceImageUrl: resolveInviteServiceImageUrl({
      serviceImageUrl: snapshot.serviceImageUrl,
      serviceName: services[0] ?? snapshot.templateName,
      serviceId: snapshot.serviceIds[0],
      salonId: options.salonId,
    }),
    inviteArtImageUrl: inviteArt.imageUrl,
    tokenContext: options.tokenContext,
  };
}

export function formatSnapshotUpdatedAt(snapshot: InviteTemplateSnapshot): string {
  try {
    return new Date(snapshot.updatedAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return snapshot.updatedAt;
  }
}

export function formatSnapshotStatus(snapshot: InviteTemplateSnapshot): string {
  if (snapshot.status === "published") return "Published";
  if (snapshot.status === "library") return "In library";
  return "Draft";
}
