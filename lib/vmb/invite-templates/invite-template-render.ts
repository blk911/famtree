import { getServiceCategoryLabel } from "@/lib/vmb/services/canonical-service-catalog";
import type { ResolvedSalonOfferDisplay } from "@/lib/vmb/salon-offers/salon-offer-catalog-types";
import { formatOfferPrice } from "@/lib/vmb/salon-offers/salon-offer-pricing";
import type {
  InviteTemplateRenderOffer,
  InviteTemplateRenderPayload,
  InviteTemplateTokenContext,
  VmbInviteTemplate,
} from "./invite-template-types";
import {
  INVITE_TEMPLATE_PREVIEW_CONTEXT,
  applyInviteTemplateTokens,
} from "./invite-template-tokens";

export type BuildInviteTemplateRenderInput = {
  inviteTemplate: VmbInviteTemplate;
  recipientPreview?: Partial<InviteTemplateTokenContext>;
  providerPreview?: Partial<InviteTemplateTokenContext>;
  salonOffer?: InviteTemplateRenderOffer;
};

export function resolvedSalonOfferToRenderOffer(
  display: ResolvedSalonOfferDisplay,
): InviteTemplateRenderOffer {
  return {
    name: display.name,
    description: display.description,
    priceLabel: formatOfferPrice(display.priceCents),
    serviceName: display.serviceName,
    addonLabels: display.addonLabels,
  };
}

function mergePreviewContext(
  recipientPreview?: Partial<InviteTemplateTokenContext>,
  providerPreview?: Partial<InviteTemplateTokenContext>,
): InviteTemplateTokenContext {
  return {
    clientName: recipientPreview?.clientName ?? INVITE_TEMPLATE_PREVIEW_CONTEXT.clientName,
    salonName: recipientPreview?.salonName ?? INVITE_TEMPLATE_PREVIEW_CONTEXT.salonName,
    providerName: providerPreview?.providerName ?? INVITE_TEMPLATE_PREVIEW_CONTEXT.providerName,
    offerName: recipientPreview?.offerName ?? providerPreview?.offerName,
    offerPrice: recipientPreview?.offerPrice ?? providerPreview?.offerPrice,
    claimLink: recipientPreview?.claimLink ?? providerPreview?.claimLink,
  };
}

function renderTemplateField(
  raw: string | undefined,
  context: InviteTemplateTokenContext,
): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return "";
  return applyInviteTemplateTokens(trimmed, context);
}

/**
 * Pure invite preview mapper — VmbInviteTemplate is the only source for invite copy.
 * Offer populates offer block only. No card-template or relationship-first fallbacks.
 */
export function buildInviteTemplateRenderPayload(
  input: BuildInviteTemplateRenderInput,
): InviteTemplateRenderPayload {
  const template = input.inviteTemplate;
  const context = mergePreviewContext(input.recipientPreview, input.providerPreview);
  const bodyRaw = template.body?.trim() ?? "";

  return {
    templateId: template.id,
    intent: template.intent,
    subject: renderTemplateField(template.subject, context),
    eyebrow: renderTemplateField(template.eyebrow, context),
    headline: renderTemplateField(template.headline, context),
    body: bodyRaw
      ? applyInviteTemplateTokens(bodyRaw, context)
      : "Template body missing.",
    ctaLabel: renderTemplateField(template.ctaLabel, context) || "Template CTA missing.",
    categoryLabel: getServiceCategoryLabel(template.categoryId),
    inviteTypeLabel: template.displayName,
    offer: input.salonOffer,
  };
}

export type InvitePreviewSourceDebug = {
  selectedInviteTemplateId: string;
  templateBody: string;
  templateCtaLabel: string;
  legacyPersonalNote?: string;
  legacyWhyThisMatters?: string;
  finalBody: string;
  finalCtaLabel: string;
};

export function debugInvitePreviewSource(debug: InvitePreviewSourceDebug): void {
  if (process.env.NODE_ENV === "production") return;
  console.debug("[invite-preview-source]", debug);
}
