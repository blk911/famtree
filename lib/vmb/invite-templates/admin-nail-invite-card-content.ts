import { applyInviteTemplateTokens } from "./invite-template-tokens";
import type { InviteTemplateTokenContext, VmbInviteTemplate } from "./invite-template-types";

export type AdminNailInviteCardTemplate = Pick<
  VmbInviteTemplate,
  | "id"
  | "displayName"
  | "intent"
  | "subject"
  | "eyebrow"
  | "headline"
  | "body"
  | "ctaLabel"
  | "defaultOfferCategory"
  | "allowedOfferCategories"
>;

export type AdminNailInviteCardOffer = {
  name: string;
  description?: string;
  price?: string;
  serviceName?: string;
  addonLabels?: string[];
};

export type ResolvedAdminNailInviteCardContent = {
  eyebrow: string;
  headline: string;
  body: string;
  ctaLabel: string;
};

export function resolveAdminNailInviteCardContent(
  template: AdminNailInviteCardTemplate,
  tokenContext?: InviteTemplateTokenContext,
): ResolvedAdminNailInviteCardContent {
  const apply = (raw: string | undefined): string => {
    const trimmed = raw?.trim() ?? "";
    if (!trimmed) return "";
    return tokenContext ? applyInviteTemplateTokens(trimmed, tokenContext) : trimmed;
  };

  const bodyRaw = template.body?.trim() ?? "";
  const ctaRaw = template.ctaLabel?.trim() ?? "";

  return {
    eyebrow: apply(template.eyebrow),
    headline: apply(template.headline),
    body: bodyRaw
      ? apply(template.body)
      : `Template body missing for ${template.id}`,
    ctaLabel: ctaRaw
      ? apply(template.ctaLabel)
      : `CTA missing for ${template.id}`,
  };
}
