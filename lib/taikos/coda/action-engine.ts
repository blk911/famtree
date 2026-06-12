import type { TaikosActionType } from "@/lib/taikos/types";
import type { CodaActionLabel } from "./types";

const ACTION_MAP: Record<CodaActionLabel, TaikosActionType> = {
  "Send PCN Invite": "CONTINUE_PCN_INVITES",
  "Send Refresh Invite": "CREATE_INVITE_DRAFT",
  "Create VIP Card": "CREATE_SERVICE_CARD_DRAFT",
  "Generate Referral Opportunity": "PREVIEW_REFERRAL_ASK",
  "Create Birthday Card": "CREATE_CAMPAIGN_DRAFT",
  "Create Reactivation Card": "PREVIEW_REACTIVATION_MESSAGE",
  "Queue Smart Send": "CREATE_INVITE_DRAFT",
};

export function mapCodaActionToType(label: CodaActionLabel): TaikosActionType {
  return ACTION_MAP[label];
}

export function actionLabelForRule(ruleId: string): CodaActionLabel {
  switch (ruleId) {
    case "wedding-lapsed":
      return "Send PCN Invite";
    case "color-refresh":
      return "Send Refresh Invite";
    case "influential-referrer":
      return "Create VIP Card";
    case "birthday-upcoming":
      return "Create Birthday Card";
    case "reactivation-window":
      return "Create Reactivation Card";
    case "referral-ready":
      return "Generate Referral Opportunity";
    default:
      return "Queue Smart Send";
  }
}
