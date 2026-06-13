import type { TaikosActionType } from "@/lib/taikos/types";
import type { VmbCardType } from "@/lib/vmb/cards/card-types";

export function cardTypeFromActionType(actionType: TaikosActionType): VmbCardType {
  switch (actionType) {
    case "CONTINUE_PCN_INVITES":
    case "CREATE_INVITE_DRAFT":
      return "pcn_invite";
    case "PREVIEW_REFERRAL_ASK":
      return "referral_invite";
    case "CREATE_SERVICE_CARD_DRAFT":
      return "service_card";
    case "VIEW_CALENDAR_GAP":
      return "open_slot_fill";
    case "PREVIEW_REACTIVATION_MESSAGE":
      return "reactivation_card";
    case "CREATE_CAMPAIGN_DRAFT":
      return "refresh_card";
    default:
      return "service_card";
  }
}
