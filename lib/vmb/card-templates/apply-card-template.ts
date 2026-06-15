import type { CardAccent, CardImageLayout } from "@/lib/vmb/cards/card-types";
import type { CardPreviewModel, CardTemplateInput } from "@/lib/vmb/cards/card-preview-model";
import {
  buildPersonalInviteCopy,
  inviteCopyToBody,
  type PersonalInviteCopy,
} from "@/lib/vmb/cards/personal-invite-copy";
import type { VmbCardTemplate } from "./card-template-types";
import { applyTemplateTokens, buildTemplateTokenContext } from "./template-tokens";

function accentFromTemplate(accent?: string): CardAccent {
  if (accent === "rose" || accent === "gold" || accent === "sage" || accent === "slate" || accent === "plum") {
    return accent;
  }
  return "plum";
}

function layoutFromImageMode(mode: VmbCardTemplate["imageMode"]): CardImageLayout {
  if (mode === "collage") return "collage";
  return "single";
}

function buildImageSlots(layout: CardImageLayout): CardPreviewModel["imageSlots"] {
  if (layout === "single") {
    return [{ id: "hero", label: "Hero image" }];
  }
  return [
    { id: "collage-1", label: "Salon moment" },
    { id: "collage-2", label: "Detail" },
    { id: "collage-3", label: "Style" },
  ];
}

function buildInviteCopyFromTemplate(
  template: VmbCardTemplate,
  input: CardTemplateInput,
  tokenContext: ReturnType<typeof buildTemplateTokenContext>,
): PersonalInviteCopy {
  const personalized = buildPersonalInviteCopy({
    recipientName: input.recipientName,
    cardType: input.cardType,
    serviceName: input.serviceName,
    visitCount: input.visitCount,
    lastVisit: input.lastVisit,
    salonName: input.salonName,
    techName: input.techName ?? tokenContext.ownerName,
    subjectLabel: input.subjectLabel,
    discoveryText: input.discoveryText,
    recommendationText: input.recommendationText,
    ticketValue: input.ticketValue,
  });

  return {
    greeting: applyTemplateTokens(template.greetingTemplate, tokenContext),
    personalConnection: personalized.personalConnection,
    inviteMessage: applyTemplateTokens(template.messageTemplate, tokenContext),
    offerMessage: applyTemplateTokens(template.offerTemplate ?? personalized.offerMessage, tokenContext),
    signature: applyTemplateTokens(template.signatureTemplate, tokenContext),
    primaryCta: template.primaryCta,
    secondaryCta: template.secondaryCta ?? personalized.secondaryCta,
  };
}

export function buildPreviewFromTemplate(
  template: VmbCardTemplate,
  input: CardTemplateInput,
  ownerName?: string,
): CardPreviewModel {
  const tokenContext = buildTemplateTokenContext(input, ownerName);
  const recipientName = input.recipientName?.trim() || undefined;
  const imageLayout = layoutFromImageMode(template.imageMode === "none" ? "single" : template.imageMode);
  const accent = accentFromTemplate(template.accent);

  if (input.cardType === "pcn_invite") {
    const inviteCopy = buildInviteCopyFromTemplate(template, input, tokenContext);
    return {
      cardType: input.cardType,
      salutation: inviteCopy.greeting,
      title: "",
      subtitle: "",
      body: inviteCopyToBody(inviteCopy),
      imageLayout,
      imageSlots: buildImageSlots(imageLayout),
      accent,
      cta: inviteCopy.primaryCta,
      tags: [],
      inviteCopy,
      techName: input.techName ?? tokenContext.ownerName,
      salonDisplayName: input.salonName ?? tokenContext.salonName,
      templateId: template.id,
      templateName: template.name,
      metadata: {
        recipientName,
        serviceName: input.serviceName,
        lastVisit: input.lastVisit,
        ticketValue: input.ticketValue,
      },
    };
  }

  const salutation = applyTemplateTokens(template.greetingTemplate, tokenContext);
  const title = applyTemplateTokens(template.titleTemplate ?? "", tokenContext);
  const subtitle = applyTemplateTokens(template.subtitleTemplate ?? "", tokenContext);
  const body = applyTemplateTokens(template.messageTemplate, tokenContext);
  const offerLine = template.offerTemplate
    ? applyTemplateTokens(template.offerTemplate, tokenContext)
    : "";
  const mergedBody = offerLine ? `${body}\n\n${offerLine}` : body;

  return {
    cardType: input.cardType,
    salutation,
    title,
    subtitle,
    body: mergedBody,
    imageLayout,
    imageSlots: buildImageSlots(imageLayout),
    accent,
    cta: template.primaryCta,
    tags: [template.name],
    templateId: template.id,
    templateName: template.name,
    metadata: {
      recipientName,
      serviceName: input.serviceName,
      lastVisit: input.lastVisit,
      birthday: input.birthday,
      referralCount: input.referralCount,
      ticketValue: input.ticketValue,
    },
  };
}

export function cardPreviewToTemplateOverride(
  draft: CardPreviewModel,
  base: VmbCardTemplate,
): VmbCardTemplate {
  const now = new Date().toISOString();
  if (draft.cardType === "pcn_invite" && draft.inviteCopy) {
    return {
      ...base,
      id: `${base.type}-${base.salonId ?? "override"}`,
      isDefault: false,
      salonId: base.salonId,
      greetingTemplate: draft.inviteCopy.greeting,
      messageTemplate: draft.inviteCopy.inviteMessage,
      offerTemplate: draft.inviteCopy.offerMessage,
      signatureTemplate: draft.inviteCopy.signature,
      primaryCta: draft.inviteCopy.primaryCta,
      secondaryCta: draft.inviteCopy.secondaryCta,
      titleTemplate: undefined,
      subtitleTemplate: undefined,
      updatedAt: now,
    };
  }

  return {
    ...base,
    id: `${base.type}-${base.salonId ?? "override"}`,
    isDefault: false,
    salonId: base.salonId,
    greetingTemplate: draft.salutation,
    titleTemplate: draft.title,
    subtitleTemplate: draft.subtitle,
    messageTemplate: draft.body,
    primaryCta: draft.cta,
    updatedAt: now,
  };
}
