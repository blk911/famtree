import type { CardTemplateInput } from "@/lib/vmb/cards/card-preview-model";
import { buildPersonalInviteCopy } from "@/lib/vmb/cards/personal-invite-copy";
import type { VmbCardTemplate } from "./card-template-types";
import { getDefaultCtaForTemplateType } from "./template-cta-labels";

export function resolveTemplateCta(template: VmbCardTemplate): string {
  return getDefaultCtaForTemplateType(template.type);
}

export function isLegacyRelationshipTemplate(template: VmbCardTemplate): boolean {
  return !template.relationshipBenefitTemplate?.trim();
}

export function resolvePersonalConnectionTemplate(
  template: VmbCardTemplate,
  input: CardTemplateInput,
): string {
  if (template.type === "pcn_invite" && isLegacyRelationshipTemplate(template)) {
    return buildPersonalInviteCopy({
      recipientName: input.recipientName,
      cardType: input.cardType,
      serviceName: input.serviceName,
      visitCount: input.visitCount,
      lastVisit: input.lastVisit,
      salonName: input.salonName,
      techName: input.techName,
      subjectLabel: input.subjectLabel,
      discoveryText: input.discoveryText,
      recommendationText: input.recommendationText,
      ticketValue: input.ticketValue,
    }).personalConnection;
  }

  return template.messageTemplate;
}

export function resolveRelationshipBenefitTemplate(template: VmbCardTemplate): string {
  if (template.relationshipBenefitTemplate?.trim()) {
    return template.relationshipBenefitTemplate;
  }

  if (template.type === "pcn_invite") {
    return template.messageTemplate;
  }

  if (template.subtitleTemplate?.trim()) {
    return template.subtitleTemplate;
  }

  return "";
}

export function resolveGreetingTemplate(template: VmbCardTemplate): string {
  return template.greetingTemplate?.trim() || "Dear {clientName},";
}

export function resolveOfferTemplateText(
  template: VmbCardTemplate,
  input: CardTemplateInput,
  catalogOfferText?: string,
): string {
  if (catalogOfferText?.trim()) {
    return catalogOfferText;
  }
  return template.offerTemplate?.trim() ?? "";
}

export function normalizeTemplateForEditor(template: VmbCardTemplate): VmbCardTemplate {
  if (template.relationshipBenefitTemplate?.trim()) {
    return template;
  }

  if (template.type === "pcn_invite") {
    return {
      ...template,
      relationshipBenefitTemplate: template.messageTemplate,
      messageTemplate:
        "I always remember your {serviceName} appointments — you know how to make a visit feel calm.",
    };
  }

  return template;
}
