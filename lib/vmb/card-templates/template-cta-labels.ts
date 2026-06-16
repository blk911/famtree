import type { VmbCardType } from "@/lib/vmb/cards/card-types";
import { getRelationshipFirstCardForTemplateType } from "@/lib/vmb/cards/relationship-first-invite-copy";

const CTA_BY_TYPE = Object.fromEntries(
  (
    [
      "pcn_invite",
      "birthday_card",
      "reactivation_card",
      "refresh_card",
      "vip_thank_you",
      "referral_invite",
      "open_slot_fill",
      "service_card",
    ] as VmbCardType[]
  ).map((type) => [type, getRelationshipFirstCardForTemplateType(type).primaryCta]),
) as Record<VmbCardType, string>;

export function getDefaultCtaForTemplateType(type: VmbCardType): string {
  return CTA_BY_TYPE[type];
}
