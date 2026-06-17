import { mapInviteOfferCategoryToOfferCategory } from "@/lib/vmb/admin/invite-offer-attachment";
import { DEFAULT_NAIL_INVITE_TEMPLATES } from "@/lib/vmb/invite-templates/default-nail-invite-templates";
import type { VmbInviteTemplate } from "@/lib/vmb/invite-templates/invite-template-types";
import {
  buildInviteTemplateSnapshot,
  parseInviteTemplateSnapshot,
  type InviteTemplateSnapshot,
} from "@/lib/vmb/invites/invite-template-snapshot";
import type { VmbOffer, VmbOfferCategory } from "@/lib/vmb/offers/offer-types";

export type NailTemplateDraft = {
  templateId: string;
  displayName: string;
  headline: string;
  body: string;
  ctaLabel: string;
  serviceIds: string[];
  serviceOptionIds: string[];
  active: boolean;
  saved: boolean;
  offerCategory: VmbOfferCategory;
  /** Frozen library asset when saved — preview and publish use this payload. */
  librarySnapshot?: InviteTemplateSnapshot | null;
};

export const TEMPLATE_LIBRARY_SAVED_MESSAGE = "Saved to Library";

export function templateStorageId(salonId: string, templateId: string): string {
  return `${salonId}-${templateId}`;
}

export function offerCategoryForInviteTemplate(template: VmbInviteTemplate): VmbOfferCategory {
  return mapInviteOfferCategoryToOfferCategory(template.defaultOfferCategory) ?? "service";
}

function findSavedOfferForTemplate(
  offers: readonly VmbOffer[],
  salonId: string,
  template: VmbInviteTemplate,
): VmbOffer | undefined {
  const storageId = templateStorageId(salonId, template.id);
  const byStorageId = offers.find((offer) => offer.id === storageId && !offer.isDefault);
  if (byStorageId) return byStorageId;

  const byTemplateId = offers.find((offer) => offer.templateId === template.id && !offer.isDefault);
  if (byTemplateId) return byTemplateId;

  const category = offerCategoryForInviteTemplate(template);
  const byCategory = offers.find(
    (offer) => offer.category === category && !offer.isDefault && !offer.templateId,
  );
  return byCategory;
}

export function buildNailTemplateDraft(
  template: VmbInviteTemplate,
  savedOffer: VmbOffer | undefined,
): NailTemplateDraft {
  return {
    templateId: template.id,
    displayName: template.displayName,
    headline: savedOffer?.headline?.trim() || template.headline,
    body: savedOffer?.body?.trim() || template.body,
    ctaLabel: savedOffer?.ctaLabel?.trim() || template.ctaLabel,
    serviceIds: savedOffer?.serviceIds ? [...savedOffer.serviceIds] : [],
    serviceOptionIds: savedOffer?.serviceOptionIds ? [...savedOffer.serviceOptionIds] : [],
    active: savedOffer?.active ?? template.active,
    saved: Boolean(savedOffer && !savedOffer.isDefault),
    offerCategory: offerCategoryForInviteTemplate(template),
    librarySnapshot: savedOffer?.inviteSnapshot
      ? parseInviteTemplateSnapshot(savedOffer.inviteSnapshot)
      : null,
  };
}

export function buildNailTemplateDrafts(
  salonId: string,
  offers: readonly VmbOffer[],
): NailTemplateDraft[] {
  return DEFAULT_NAIL_INVITE_TEMPLATES.map((template) =>
    buildNailTemplateDraft(template, findSavedOfferForTemplate(offers, salonId, template)),
  );
}

export function nailTemplateDraftToOffer(
  draft: NailTemplateDraft,
  salonId: string,
  snapshot?: InviteTemplateSnapshot,
): VmbOffer {
  const now = new Date().toISOString();
  const embeddedSnapshot =
    snapshot ??
    (draft.librarySnapshot ? { ...draft.librarySnapshot, updatedAt: now } : undefined);
  return {
    id: templateStorageId(salonId, draft.templateId),
    templateId: draft.templateId,
    salonId,
    category: draft.offerCategory,
    name: draft.displayName,
    description: draft.body.slice(0, 160),
    offerText: draft.body,
    headline: draft.headline,
    body: draft.body,
    ctaLabel: draft.ctaLabel,
    serviceIds: [...draft.serviceIds],
    serviceOptionIds: [...draft.serviceOptionIds],
    active: draft.active,
    isDefault: false,
    source: "manual",
    inviteSnapshot: embeddedSnapshot,
    createdAt: embeddedSnapshot?.createdAt ?? now,
    updatedAt: now,
  };
}

export type BuildDraftSnapshotOptions = {
  ownerName?: string;
  salonName?: string;
  ownerPhotoUrl?: string;
  salonLogoUrl?: string;
  serviceImageUrl?: string;
  priceLabel?: string;
  expirationLabel?: string;
  termsText?: string;
};

/** Builds the frozen snapshot payload used for preview, library storage, and publish. */
export function buildDraftInviteSnapshot(
  draft: NailTemplateDraft,
  options: BuildDraftSnapshotOptions = {},
): InviteTemplateSnapshot {
  return buildInviteTemplateSnapshot({
    draft,
    previousSnapshot: draft.librarySnapshot,
    ownerName: options.ownerName,
    salonName: options.salonName,
    ownerPhotoUrl: options.ownerPhotoUrl,
    salonLogoUrl: options.salonLogoUrl,
    serviceImageUrl: options.serviceImageUrl,
    priceLabel: options.priceLabel,
    expirationLabel: options.expirationLabel,
    termsText: options.termsText,
    status: draft.saved ? "library" : "draft",
  });
}

export function baselineNailTemplateDraft(templateId: string): NailTemplateDraft | undefined {
  const template = DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === templateId);
  if (!template) return undefined;
  return buildNailTemplateDraft(template, undefined);
}
