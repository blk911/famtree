import type { VmbCardType } from "@/lib/vmb/cards/card-types";
import type { VmbInviteType } from "./invite-template-types";

export function inviteTemplateIdForType(inviteType: VmbInviteType): string {
  return `nails-${inviteType.replace(/_/g, "-")}`;
}

export const CARD_TYPE_TO_INVITE_TEMPLATE_ID: Partial<Record<VmbCardType, string>> = {
  pcn_invite: inviteTemplateIdForType("private_client_network"),
  birthday_card: inviteTemplateIdForType("birthday_celebration"),
  referral_invite: inviteTemplateIdForType("referral_invite"),
  open_slot_fill: inviteTemplateIdForType("open_chair"),
  refresh_card: inviteTemplateIdForType("refresh_reminder"),
  reactivation_card: inviteTemplateIdForType("we_miss_you"),
  vip_thank_you: inviteTemplateIdForType("vip_thank_you"),
  service_card: inviteTemplateIdForType("favorite_providers"),
};

export const INVITE_TEMPLATE_ID_TO_CARD_TYPE: Partial<Record<string, VmbCardType>> =
  Object.fromEntries(
    Object.entries(CARD_TYPE_TO_INVITE_TEMPLATE_ID).map(([cardType, templateId]) => [
      templateId,
      cardType as VmbCardType,
    ]),
  );

export function getInviteTemplateIdForCardType(cardType: VmbCardType): string | undefined {
  return CARD_TYPE_TO_INVITE_TEMPLATE_ID[cardType];
}

export function getCardTypeForInviteTemplateId(templateId: string): VmbCardType | undefined {
  return INVITE_TEMPLATE_ID_TO_CARD_TYPE[templateId];
}

export function isNailInviteTemplateId(templateId: string): boolean {
  return templateId.startsWith("nails-");
}
