import type { VmbCardType } from "@/lib/vmb/cards/card-types";

export type VmbOutreachTemplateType = VmbCardType;

export type VmbCardTemplateTone = "warm" | "direct" | "playful" | "premium";

export type VmbCardTemplateImageMode = "single" | "collage" | "none";

export const VMB_CARD_TEMPLATE_TOKENS = [
  "{clientName}",
  "{ownerName}",
  "{salonName}",
  "{serviceName}",
  "{lastVisit}",
  "{visitCount}",
  "{referralCount}",
  "{offer}",
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
