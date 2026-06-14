import type { SalonQaSuggestedAction, SalonQaSuggestedCard } from "./types";

export type LegacySalonQaSuggestedAction = {
  label: string;
  actionType:
    | "preview_pcn_invite"
    | "preview_refresh_card"
    | "preview_reactivation_card"
    | "preview_birthday_card"
    | "preview_referral_invite"
    | "show_clients";
  clientName?: string;
};

export type AnySalonQaSuggestedAction = SalonQaSuggestedAction | LegacySalonQaSuggestedAction;

function isLegacyAction(
  action: AnySalonQaSuggestedAction,
): action is LegacySalonQaSuggestedAction {
  return "actionType" in action && !("kind" in action);
}

function legacyCardType(
  actionType: LegacySalonQaSuggestedAction["actionType"],
): SalonQaSuggestedCard["cardType"] {
  switch (actionType) {
    case "preview_pcn_invite":
      return "pcn_invite";
    case "preview_birthday_card":
      return "birthday_card";
    case "preview_reactivation_card":
      return "reactivation_card";
    case "preview_referral_invite":
      return "referral_card";
    case "preview_refresh_card":
      return "reactivation_card";
    default:
      return "service_card";
  }
}

export function normalizeSalonQaSuggestedAction(
  action: AnySalonQaSuggestedAction | undefined,
): SalonQaSuggestedAction | undefined {
  if (!action) return undefined;
  if (!isLegacyAction(action)) return action;

  if (action.actionType === "show_clients") {
    return {
      kind: "follow_up_query",
      label: action.label,
      question: action.label,
    };
  }

  return {
    kind: "preview_card",
    label: action.label,
    cardType: legacyCardType(action.actionType),
    clientName: action.clientName ?? "Client",
    reason: action.label,
  };
}

export function followUpQueryFromAction(action: SalonQaSuggestedAction): string | undefined {
  if (action.kind === "follow_up_query") return action.question;
  if (action.kind === "filter_opportunities") {
    switch (action.filterIntent) {
      case "pcn_candidates":
        return "Who should join my PCN?";
      case "overdue_clients":
        return "Who is overdue?";
      case "lapsed_clients":
        return "Who hasn't been back?";
      case "referral_candidates":
        return "Who should I ask for referrals?";
      case "birthday_candidates":
        return "Who has a birthday soon?";
      default:
        return action.label;
    }
  }
  return undefined;
}

export function submitQuestionForSalonQaAction(
  action: AnySalonQaSuggestedAction | undefined,
): string | undefined {
  const normalized = normalizeSalonQaSuggestedAction(action);
  if (!normalized) return undefined;
  return followUpQueryFromAction(normalized);
}
