import { getServiceCategoryLabel } from "@/lib/vmb/services/canonical-service-catalog";
import type { ResolvedSalonOfferDisplay } from "@/lib/vmb/salon-offers/salon-offer-catalog-types";
import { formatOfferPrice } from "@/lib/vmb/salon-offers/salon-offer-pricing";
import type {
  InviteTemplateRenderOffer,
  InviteTemplateRenderPayload,
  InviteTemplateTokenContext,
  VmbInviteTemplate,
} from "./invite-template-types";
import { applyInviteTemplateTokens } from "./invite-template-tokens";

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

export function buildInviteTemplateRenderPayload(
  template: VmbInviteTemplate,
  context: InviteTemplateTokenContext,
  offer?: InviteTemplateRenderOffer,
): InviteTemplateRenderPayload {
  return {
    subject: applyInviteTemplateTokens(template.subject, context),
    eyebrow: applyInviteTemplateTokens(template.eyebrow, context),
    headline: applyInviteTemplateTokens(template.headline, context),
    body: applyInviteTemplateTokens(template.body, context),
    ctaLabel: applyInviteTemplateTokens(template.ctaLabel, context),
    categoryLabel: getServiceCategoryLabel(template.categoryId),
    inviteTypeLabel: template.displayName,
    offer,
  };
}
