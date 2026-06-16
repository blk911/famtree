import type { VmbCardType } from "@/lib/vmb/cards/card-types";
import { getRelationshipFirstCardForTemplateType } from "@/lib/vmb/cards/relationship-first-invite-copy";

const CTA_BY_TYPE = Object.fromEntries(
  (
    [
      "pcn_invite",
      "refresh_card",
      "reactivation_card",
      "open_slot_fill",
      "referral_invite",
      "vip_thank_you",
      "birthday_card",
      "service_card",
    ] as VmbCardType[]
  ).map((type) => [type, getRelationshipFirstCardForTemplateType(type).primaryCta]),
) as Record<VmbCardType, string>;

export function getDefaultCtaForTemplateType(type: VmbCardType): string {
  return CTA_BY_TYPE[type];
}
