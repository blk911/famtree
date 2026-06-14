import type { SalonQaResult, SalonQaSuggestedCard, SalonQueryIntent } from "./types";

const MAX_SUGGESTED_CARDS = 10;

const INTENT_CARD_TYPE: Partial<Record<SalonQueryIntent, SalonQaSuggestedCard["cardType"]>> = {
  pcn_candidates: "pcn_invite",
  first_20_pcn: "pcn_invite",
  first_50_pcn: "pcn_invite",
  birthday_candidates: "birthday_card",
  overdue_clients: "reactivation_card",
  lapsed_clients: "reactivation_card",
  open_slot_candidates: "reactivation_card",
  referral_candidates: "referral_card",
  vip_candidates: "thank_you_card",
  upgrade_candidates: "service_card",
  service_search: "service_card",
  best_clients: "thank_you_card",
  top_spenders: "thank_you_card",
  frequent_clients: "thank_you_card",
};

const INTENT_FILTER_LABEL: Partial<Record<SalonQueryIntent, string>> = {
  pcn_candidates: "Private Client Network",
  first_20_pcn: "Private Client Network",
  first_50_pcn: "Private Client Network",
  birthday_candidates: "Birthday Opportunities",
  overdue_clients: "Reactivation Opportunities",
  lapsed_clients: "Reactivation Opportunities",
  open_slot_candidates: "Rebooking Opportunities",
  referral_candidates: "Referral Opportunities",
  vip_candidates: "VIP Thank-You",
  upgrade_candidates: "Service Opportunities",
  service_search: "Service Opportunities",
  best_clients: "Top Client Opportunities",
  top_spenders: "Top Spender Opportunities",
  frequent_clients: "Frequent Client Opportunities",
  client_search: "Client Matches",
};

function cardTypeForResult(
  intent: SalonQueryIntent,
  result: SalonQaResult,
): SalonQaSuggestedCard["cardType"] {
  const fromResult = result.suggestedCardType;
  if (fromResult === "pcn_invite") return "pcn_invite";
  if (fromResult === "birthday_card") return "birthday_card";
  if (fromResult === "reactivation_card") return "reactivation_card";
  if (fromResult === "refresh_card") return "reactivation_card";
  if (fromResult === "referral_card") return "referral_card";
  return INTENT_CARD_TYPE[intent] ?? "service_card";
}

export function filterLabelForIntent(intent: SalonQueryIntent): string | undefined {
  return INTENT_FILTER_LABEL[intent];
}

export function buildSuggestedCards(
  intent: SalonQueryIntent,
  results: SalonQaResult[],
  limit?: number,
): SalonQaSuggestedCard[] {
  const cardTypeDefault = INTENT_CARD_TYPE[intent];
  if (!cardTypeDefault && results.length === 0) return [];

  const max = Math.min(limit ?? MAX_SUGGESTED_CARDS, MAX_SUGGESTED_CARDS);
  return results.slice(0, max).map((result) => ({
    clientId: result.clientId,
    clientName: result.clientName,
    cardType: cardTypeForResult(intent, result),
    reason: result.reason,
    confidence: result.score ? Math.min(1, result.score / 100) : undefined,
  }));
}

export function enrichSalonQaAnswer<T extends { intent: string; results: SalonQaResult[] }>(
  answer: T,
  intent: SalonQueryIntent,
  resultLimit?: number,
): T & { suggestedCards: SalonQaSuggestedCard[]; filterLabel?: string } {
  const suggestedCards = buildSuggestedCards(intent, answer.results, resultLimit);
  const filterLabel = suggestedCards.length > 0 ? filterLabelForIntent(intent) : undefined;
  return { ...answer, suggestedCards, filterLabel };
}
