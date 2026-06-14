import type { TaikosActionType } from "@/lib/taikos/types";
import type { SalonQaSuggestedCard } from "./types";

export function actionFromCardType(cardType: SalonQaSuggestedCard["cardType"]): TaikosActionType {
  switch (cardType) {
    case "pcn_invite":
      return "CONTINUE_PCN_INVITES";
    case "birthday_card":
      return "CREATE_CAMPAIGN_DRAFT";
    case "reactivation_card":
      return "PREVIEW_REACTIVATION_MESSAGE";
    case "referral_card":
      return "PREVIEW_REFERRAL_ASK";
    case "thank_you_card":
    case "service_card":
      return "CREATE_SERVICE_CARD_DRAFT";
    default:
      return "CREATE_INVITE_DRAFT";
  }
}
