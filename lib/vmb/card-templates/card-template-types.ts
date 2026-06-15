import type { VmbCardType } from "@/lib/vmb/cards/card-types";
import type { VmbOfferCategory } from "@/lib/vmb/offers/offer-types";

export type VmbOutreachTemplateType = VmbCardType;

export type VmbCardTemplateTone = "warm" | "direct" | "playful" | "premium";

export type VmbCardTemplateImageMode = "single" | "collage" | "none";

export type VmbCardTemplateOfferMode = "none" | "optional" | "recommended" | "required";

export const VMB_CARD_TEMPLATE_TOKENS = [
  "{clientName}",
  "{ownerName}",
  "{salonName}",
  "{serviceName}",
  "{lastVisit}",
  "{visitCount}",
  "{referralCount}",
  "{offer}",
  "{offerValue}",
  "{offerTerms}",
  "{nextOpening}",
] as const;

export type VmbCardTemplateToken = (typeof VMB_CARD_TEMPLATE_TOKENS)[number];

export type VmbCardTemplate = {
  id: string;
  type: VmbOutreachTemplateType;
  name: string;
  description: string;
  isDefault: boolean;
  salonId?: string;
  imageMode: VmbCardTemplateImageMode;
  defaultImageKey?: string;
  accent?: string;
  tone: VmbCardTemplateTone;
  greetingTemplate: string;
  titleTemplate?: string;
  subtitleTemplate?: string;
  messageTemplate: string;
  offerTemplate?: string;
  offerCategory?: VmbOfferCategory;
  offerRequired?: boolean;
  offerMode?: VmbCardTemplateOfferMode;
  primaryCta: string;
  secondaryCta?: string;
  signatureTemplate: string;
  tokens: string[];
  createdAt: string;
  updatedAt: string;
};

export type VmbCardTemplateOverrideRow = {
  salonId: string;
  type: VmbOutreachTemplateType;
  template: VmbCardTemplate;
};
