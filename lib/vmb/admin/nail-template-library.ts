import { mapInviteOfferCategoryToOfferCategory } from "@/lib/vmb/admin/invite-offer-attachment";
import { DEFAULT_NAIL_INVITE_TEMPLATES } from "@/lib/vmb/invite-templates/default-nail-invite-templates";
import type { VmbInviteTemplate } from "@/lib/vmb/invite-templates/invite-template-types";
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
};

export const TEMPLATE_LIBRARY_SAVED_MESSAGE =
  "Saved to Template Library. Preview shows what clients will see.";

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

export function nailTemplateDraftToOffer(draft: NailTemplateDraft, salonId: string): VmbOffer {
  const now = new Date().toISOString();
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
    createdAt: now,
    updatedAt: now,
  };
}

export function baselineNailTemplateDraft(templateId: string): NailTemplateDraft | undefined {
  const template = DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === templateId);
  if (!template) return undefined;
  return buildNailTemplateDraft(template, undefined);
}
