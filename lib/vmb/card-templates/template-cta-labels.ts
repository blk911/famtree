import type { VmbCardType } from "@/lib/vmb/cards/card-types";

const CTA_BY_TYPE: Record<VmbCardType, string> = {
  pcn_invite: "Join Private Client Network",
  birthday_card: "Claim Birthday Treat",
  reactivation_card: "Let's Reconnect",
  refresh_card: "Book Refresh",
  vip_thank_you: "See Private Invite",
  referral_invite: "Invite A Friend",
  open_slot_fill: "Reserve Opening",
  service_card: "View Service",
};

export function getDefaultCtaForTemplateType(type: VmbCardType): string {
  return CTA_BY_TYPE[type];
}
