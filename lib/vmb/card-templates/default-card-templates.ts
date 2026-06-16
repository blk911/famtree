import { VMB_CARD_TYPES, type VmbCardType } from "@/lib/vmb/cards/card-types";
import { getRelationshipFirstCardForTemplateType } from "@/lib/vmb/cards/relationship-first-invite-copy";
import type { VmbCardTemplate } from "./card-template-types";
import { VMB_CARD_TEMPLATE_TOKENS } from "./card-template-types";

const BASE_TOKENS = [...VMB_CARD_TEMPLATE_TOKENS];
const NOW = "2026-06-12T00:00:00.000Z";

function seedTemplate(type: VmbCardType): VmbCardTemplate {
  const copy = getRelationshipFirstCardForTemplateType(type);
  return {
    id: `default-${type}`,
    type,
    isDefault: true,
    tokens: BASE_TOKENS,
    createdAt: NOW,
    updatedAt: NOW,
    name: copy.label,
    description: `${copy.label} — relationship-first default.`,
    imageMode: type === "vip_thank_you" || type === "service_card" ? "collage" : "single",
    accent:
      type === "birthday_card"
        ? "rose"
        : type === "vip_thank_you"
          ? "gold"
          : type === "refresh_card" || type === "referral_invite"
            ? "sage"
            : type === "open_slot_fill"
              ? "rose"
              : type === "service_card"
                ? "slate"
                : "plum",
    tone: type === "vip_thank_you" || type === "pcn_invite" ? "premium" : type === "birthday_card" ? "playful" : "warm",
    greetingTemplate: copy.greetingTemplate,
    messageTemplate: copy.messageTemplate,
    relationshipBenefitTemplate: copy.relationshipBenefitTemplate,
    offerTemplate: copy.offerTemplate,
    signatureTemplate: copy.signatureTemplate,
    titleTemplate: copy.titleTemplate,
    subtitleTemplate: copy.subtitleTemplate,
    offerCategory:
      type === "pcn_invite"
        ? "pcn"
        : type === "birthday_card"
          ? "birthday"
          : type === "reactivation_card"
            ? "reactivation"
            : type === "refresh_card"
              ? "refresh"
              : type === "vip_thank_you"
                ? "vip"
                : type === "referral_invite"
                  ? "referral"
                  : type === "open_slot_fill"
                    ? "open_slot"
                    : "service",
    offerMode:
      type === "open_slot_fill"
        ? "required"
        : type === "pcn_invite" || type === "vip_thank_you"
          ? "optional"
          : "recommended",
    offerRequired: type === "open_slot_fill",
  };
}

export const DEFAULT_CARD_TEMPLATES: VmbCardTemplate[] = VMB_CARD_TYPES.map((type) => seedTemplate(type));

const DEFAULT_BY_TYPE = new Map(DEFAULT_CARD_TEMPLATES.map((template) => [template.type, template]));

export function getDefaultTemplate(type: VmbCardType): VmbCardTemplate {
  const template = DEFAULT_BY_TYPE.get(type);
  if (!template) {
    throw new Error(`Missing default card template for ${type}`);
  }
  return { ...template };
}

export function getAllDefaultTemplates(): VmbCardTemplate[] {
  return VMB_CARD_TYPES.map((type) => getDefaultTemplate(type));
}

export const CARD_TEMPLATE_PREVIEW_CONTEXT = {
  clientName: "Grace",
  ownerName: "Jenny",
  salonName: "Blue Mountain Salon",
  serviceName: "Gel-X",
  lastVisit: "May 12",
  visitCount: 3,
  referralCount: 1,
  offer: "Early access to private openings",
  nextOpening: "Thursday at 2:00 PM",
};
