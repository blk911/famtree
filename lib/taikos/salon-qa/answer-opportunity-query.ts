import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import { enrichSalonQaAnswer } from "./build-suggested-cards";
import { matchSalonQuery } from "./match-salon-query";
import {
  buildSalonClientIndex,
  clientToQaResult,
  firstName,
  type EnrichedSalonClient,
} from "./salon-client-index";
import type {
  SalonQaAnswer,
  SalonQaAnswerBody,
  SalonQaResult,
  SalonQaSuggestedAction,
  SalonQueryIntent,
  SalonQueryMatch,
} from "./types";

type AnswerParams = {
  question: string;
  analysis: VmbBookAnalysisResult;
  ownerName?: string;
};

function rankByScore(clients: EnrichedSalonClient[], scoreFn: (c: EnrichedSalonClient) => number): EnrichedSalonClient[] {
  return [...clients].sort((a, b) => scoreFn(b) - scoreFn(a));
}

function limitResults<T>(items: T[], limit?: number, defaultMax = 8): T[] {
  const max = limit ?? defaultMax;
  return items.slice(0, Math.min(max, defaultMax));
}

function evidenceForClient(client: EnrichedSalonClient): string[] {
  const evidence: string[] = [];
  if (client.visitCount > 0) evidence.push(`${client.visitCount} visits on file`);
  if (client.spend > 0) evidence.push(`Strong visit value around $${Math.round(client.spend)}`);
  if (client.daysInactive !== null) evidence.push(`${client.daysInactive} days since last visit`);
  if (client.services.length > 0) evidence.push(`Recent service: ${client.services[0]}`);
  if (client.triggerTypes.length > 0) evidence.push(client.triggerTypes.slice(0, 2).join(" · "));
  return evidence.slice(0, 3);
}

function reasonForPcn(client: EnrichedSalonClient): string {
  const parts: string[] = [];
  if (client.isFrequent || client.visitCount >= 3) parts.push("frequent client");
  if (client.isVip || client.spend >= 150) parts.push("high relationship value");
  if (client.referralScore >= 20) parts.push("referral potential");
  if (client.daysInactive !== null && client.daysInactive <= 60) parts.push("recent activity");
  if (client.services.some((s) => /premium|package|bridal/i.test(s))) parts.push("premium services");
  return parts.length > 0 ? parts.slice(0, 3).join(", ") : "strong fit for a personal invitation";
}

function suggestedActionForIntent(
  intent: SalonQueryMatch["intent"],
  top?: EnrichedSalonClient,
): SalonQaSuggestedAction | undefined {
  const name = top?.clientName;
  switch (intent) {
    case "pcn_candidates":
    case "first_20_pcn":
    case "first_50_pcn":
      return name
        ? {
            kind: "preview_card",
            label: `Preview ${firstName(name)}'s Private Client Invite`,
            cardType: "pcn_invite",
            clientName: name,
          }
        : undefined;
    case "lapsed_clients":
    case "overdue_clients":
    case "open_slot_candidates":
      return name
        ? {
            kind: "preview_card",
            label: `Preview a refresh invite for ${firstName(name)}`,
            cardType: "reactivation_card",
            clientName: name,
          }
        : undefined;
    case "birthday_candidates":
      return name
        ? {
            kind: "preview_card",
            label: `Preview a birthday card for ${firstName(name)}`,
            cardType: "birthday_card",
            clientName: name,
          }
        : undefined;
    case "referral_candidates":
      return name
        ? {
            kind: "preview_card",
            label: `Preview a referral ask for ${firstName(name)}`,
            cardType: "referral_card",
            clientName: name,
          }
        : undefined;
    case "service_search":
    case "best_clients":
    case "top_spenders":
    case "upgrade_candidates":
      return name
        ? {
            kind: "preview_card",
            label: `Preview a refresh invite for ${firstName(name)}`,
            cardType: "reactivation_card",
            clientName: name,
          }
        : undefined;
    default:
      return undefined;
  }
}

function followUpForIntent(intent: SalonQueryMatch["intent"]): string {
  switch (intent) {
    case "pcn_candidates":
      return "Want me to build the first 20 PCN invite list?";
    case "first_20_pcn":
      return "Want me to preview the top invite on that list?";
    case "first_50_pcn":
      return "Want me to narrow this to your first 20?";
    case "service_search":
      return "Want me to find another service group from your book?";
    case "overdue_clients":
    case "lapsed_clients":
      return "Want me to find who is most likely to rebook this week?";
    case "birthday_candidates":
      return "Want me to draft birthday cards for the top names?";
    case "open_slot_candidates":
      return "Want me to rank who to call first for an opening?";
    case "unknown":
      return "Try asking about PCN invites, overdue clients, referrals, birthdays, or a service like Gel-X.";
    default:
      return "What else would you like to explore in your book?";
  }
}

function buildUnknownAnswer(question: string, match: SalonQueryMatch): SalonQaAnswer {
  return {
    question,
    queryMode: "opportunity",
    intent: "unknown",
    confidence: match.confidence,
    headline: "I can help with a few things in your book.",
    answerText:
      "I can help with PCN invites, overdue clients, referrals, birthdays, open slots, and service searches.",
    results: [],
    suggestedCards: [],
    followUpPrompt: followUpForIntent("unknown"),
  };
}

function buildPcnAnswer(
  question: string,
  match: SalonQueryMatch,
  clients: EnrichedSalonClient[],
  limit?: number,
): SalonQaAnswerBody {
  const ranked = rankByScore(clients, (c) => c.pcnScore);
  const top = limitResults(ranked, limit, limit ?? 8);
  const results: SalonQaResult[] = top.map((c, i) =>
    clientToQaResult(c, reasonForPcn(c), evidenceForClient(c), "pcn_invite"),
  );

  const count = top.length;
  const first = top[0];
  const headline =
    count > 0
      ? `I found ${count} strong PCN ${count === 1 ? "candidate" : "candidates"}.`
      : "I do not see strong PCN candidates yet.";

  let answerText =
    count > 0
      ? `${firstName(first.clientName)} is the first name I would look at. ${firstName(first.clientName)} has ${reasonForPcn(first)}.`
      : "Upload more visit history or try asking about overdue clients with strong history.";

  return {
    question,
    intent: match.intent,
    confidence: match.confidence,
    headline,
    answerText,
    results,
    suggestedAction: suggestedActionForIntent(match.intent, first),
    followUpPrompt: followUpForIntent(match.intent),
  };
}

function buildBestClientsAnswer(question: string, match: SalonQueryMatch, clients: EnrichedSalonClient[]): SalonQaAnswerBody {
  const ranked = rankByScore(clients, (c) => c.pcnScore * 0.5 + c.spend * 0.3 + c.visitCount * 5);
  const top = limitResults(ranked);
  const results = top.map((c) =>
    clientToQaResult(c, "Strong mix of visits, value, and recency", evidenceForClient(c)),
  );
  const first = top[0];
  return {
    question,
    intent: match.intent,
    confidence: match.confidence,
    headline: top.length ? `I found ${top.length} standout clients.` : "No standout clients surfaced yet.",
    answerText: first
      ? `${firstName(first.clientName)} leads the list with ${reasonForPcn(first)}.`
      : "Try asking about top spenders or frequent visitors.",
    results,
    suggestedAction: suggestedActionForIntent("best_clients", first),
    followUpPrompt: "Want me to find who should join your PCN from this group?",
  };
}

function buildTopSpendersAnswer(question: string, match: SalonQueryMatch, clients: EnrichedSalonClient[]): SalonQaAnswerBody {
  const ranked = rankByScore(clients, (c) => c.spend);
  const top = limitResults(ranked);
  const results = top.map((c) =>
    clientToQaResult(c, "High spend / ticket value", evidenceForClient(c)),
  );
  const first = top[0];
  return {
    question,
    intent: match.intent,
    confidence: match.confidence,
    headline: top.length ? `Here are your top ${top.length} spenders.` : "No spend leaders found yet.",
    answerText: first
      ? `${firstName(first.clientName)} stands out on visit value in your book.`
      : "Try asking about VIP clients or upgrade candidates.",
    results,
    suggestedAction: suggestedActionForIntent("top_spenders", first),
    followUpPrompt: "Want me to find who deserves a thank-you note?",
  };
}

function buildFrequentClientsAnswer(
  question: string,
  match: SalonQueryMatch,
  clients: EnrichedSalonClient[],
): SalonQaAnswerBody {
  const ranked = rankByScore(clients, (c) => c.visitCount);
  const top = limitResults(ranked.filter((c) => c.visitCount > 0 || c.isFrequent));
  const results = top.map((c) =>
    clientToQaResult(c, "Frequent visitor", evidenceForClient(c)),
  );
  const first = top[0];
  return {
    question,
    intent: match.intent,
    confidence: match.confidence,
    headline: top.length ? `I found ${top.length} frequent clients.` : "No frequent visitors surfaced yet.",
    answerText: first
      ? `${firstName(first.clientName)} comes up often in your visit history.`
      : "Try asking about best clients or PCN candidates.",
    results,
    suggestedAction: suggestedActionForIntent("frequent_clients", first),
    followUpPrompt: "Want me to find referral candidates among them?",
  };
}

function buildLapsedOrOverdueAnswer(
  question: string,
  match: SalonQueryMatch,
  clients: EnrichedSalonClient[],
  mode: "lapsed" | "overdue",
): SalonQaAnswerBody {
  const filtered = clients.filter((c) => (mode === "lapsed" ? c.isLapsed : c.isOverdue || c.isLapsed));
  const ranked = rankByScore(filtered, (c) => (c.daysInactive ?? 0) * 2 + c.spend * 0.2);
  const top = limitResults(ranked.length > 0 ? ranked : clients.filter((c) => c.daysInactive !== null));
  const results = top.map((c) =>
    clientToQaResult(
      c,
      mode === "lapsed" ? "Hasn't been back recently" : "Past likely refresh window",
      evidenceForClient(c),
      mode === "lapsed" ? "reactivation_card" : "refresh_card",
    ),
  );
  const first = top[0];
  return {
    question,
    intent: match.intent,
    confidence: match.confidence,
    headline: top.length
      ? `I found ${top.length} ${mode === "lapsed" ? "clients who haven't been back" : "overdue clients"}.`
      : "No overdue clients stood out in this book.",
    answerText: first
      ? `${firstName(first.clientName)} is worth a personal reach-out based on visit history.`
      : "Your book looks fairly current — try asking about open slot candidates.",
    results,
    suggestedAction: suggestedActionForIntent(match.intent, first),
    followUpPrompt: followUpForIntent(match.intent),
  };
}

function buildReferralAnswer(question: string, match: SalonQueryMatch, clients: EnrichedSalonClient[]): SalonQaAnswerBody {
  const ranked = rankByScore(clients, (c) => c.referralScore);
  const top = limitResults(ranked.filter((c) => c.referralScore > 0 || c.isVip || c.isFrequent));
  const results = top.map((c) =>
    clientToQaResult(c, "Referral / influence signal", evidenceForClient(c), "referral_card"),
  );
  const first = top[0];
  return {
    question,
    intent: match.intent,
    confidence: match.confidence,
    headline: top.length ? `I found ${top.length} referral candidates.` : "No referral standouts yet.",
    answerText: first
      ? `${firstName(first.clientName)} looks like someone who could share you with friends.`
      : "Try asking about VIP clients or frequent visitors.",
    results,
    suggestedAction: suggestedActionForIntent("referral_candidates", first),
    followUpPrompt: followUpForIntent("referral_candidates"),
  };
}

function buildBirthdayAnswer(question: string, match: SalonQueryMatch, clients: EnrichedSalonClient[]): SalonQaAnswerBody {
  const birthdayClients = clients.filter((c) => c.birthdaySignal);
  const top = limitResults(birthdayClients);
  if (top.length === 0) {
    return {
      question,
      intent: match.intent,
      confidence: match.confidence,
      headline: "I do not see upcoming birthdays in this book yet.",
      answerText:
        "Birthday dates are not in this export. I can still help with celebration clients or VIP thank-yous.",
      results: [],
      followUpPrompt: "Want me to find celebration or gift-moment clients instead?",
    };
  }
  const results = top.map((c) =>
    clientToQaResult(c, "Birthday or celebration signal", evidenceForClient(c), "birthday_card"),
  );
  const first = top[0];
  return {
    question,
    intent: match.intent,
    confidence: match.confidence,
    headline: `I found ${top.length} birthday ${top.length === 1 ? "moment" : "moments"}.`,
    answerText: `${firstName(first.clientName)} is a good place to start for a birthday card.`,
    results,
    suggestedAction: suggestedActionForIntent("birthday_candidates", first),
    followUpPrompt: followUpForIntent("birthday_candidates"),
  };
}

function buildOpenSlotAnswer(question: string, match: SalonQueryMatch, clients: EnrichedSalonClient[]): SalonQaAnswerBody {
  const ranked = rankByScore(
    clients.filter((c) => c.isOverdue || c.isLapsed || c.daysInactive !== null),
    (c) => (c.daysInactive ?? 0) + c.spend * 0.15,
  );
  const top = limitResults(ranked.length > 0 ? ranked : clients);
  const results = top.map((c) =>
    clientToQaResult(c, "Likely due for a visit", evidenceForClient(c), "refresh_card"),
  );
  const first = top[0];
  return {
    question,
    intent: match.intent,
    confidence: match.confidence,
    headline: "I do not see open chair data yet, but I can still find clients who are likely due.",
    answerText: first
      ? `${firstName(first.clientName)} is a strong call for a rebooking conversation.`
      : "Try asking who is overdue or who has not been back.",
    results,
    suggestedAction: suggestedActionForIntent("open_slot_candidates", first),
    followUpPrompt: followUpForIntent("open_slot_candidates"),
  };
}

function buildUpgradeAnswer(question: string, match: SalonQueryMatch, clients: EnrichedSalonClient[]): SalonQaAnswerBody {
  const ranked = rankByScore(
    clients.filter((c) => c.isVip || c.spend >= 120 || c.triggerTypes.includes("High Spend")),
    (c) => c.spend + c.visitCount * 5,
  );
  const top = limitResults(ranked.length > 0 ? ranked : clients);
  const results = top.map((c) =>
    clientToQaResult(c, "Premium services / add-on potential", evidenceForClient(c)),
  );
  const first = top[0];
  return {
    question,
    intent: match.intent,
    confidence: match.confidence,
    headline: top.length ? `I found ${top.length} upgrade candidates.` : "No upgrade standouts yet.",
    answerText: first
      ? `${firstName(first.clientName)} shows premium service and add-on potential.`
      : "Try asking about top spenders or VIP clients.",
    results,
    suggestedAction: suggestedActionForIntent("upgrade_candidates", first),
    followUpPrompt: "Want me to find PCN candidates from this group?",
  };
}

function buildServiceSearchAnswer(
  question: string,
  match: SalonQueryMatch,
  clients: EnrichedSalonClient[],
): SalonQaAnswerBody {
  const keyword = (match.serviceKeyword ?? "").toLowerCase();
  const matched = clients.filter((c) => c.searchText.includes(keyword));
  const ranked = rankByScore(matched, (c) => c.visitCount * 5 + c.spend);
  const top = limitResults(ranked);

  if (top.length === 0) {
    return {
      question,
      intent: match.intent,
      confidence: match.confidence,
      headline: keyword ? `I did not find clients tied to ${keyword} in this book.` : "No service matches found.",
      answerText: "Try another service name or ask about your best clients.",
      results: [],
      followUpPrompt: followUpForIntent("service_search"),
    };
  }

  const results = top.map((c) =>
    clientToQaResult(
      c,
      `Connected to ${keyword || "that service"}`,
      evidenceForClient(c),
      "refresh_card",
    ),
  );
  const first = top[0];
  return {
    question,
    intent: match.intent,
    confidence: match.confidence,
    headline: `I found ${top.length} clients connected to ${keyword || "that service"}.`,
    answerText: `${firstName(first.clientName)} and ${top[1] ? firstName(top[1].clientName) : "others"} are strong starting points based on visit history.`,
    results,
    suggestedAction: suggestedActionForIntent("service_search", first),
    followUpPrompt: followUpForIntent("service_search"),
  };
}

function buildClientSearchAnswer(
  question: string,
  match: SalonQueryMatch,
  clients: EnrichedSalonClient[],
): SalonQaAnswerBody {
  const hint = (match.clientNameHint ?? question).toLowerCase();
  const tokens = hint.split(/\s+/).filter(Boolean);
  const matched = clients.filter((c) => {
    const name = c.clientName.toLowerCase();
    return tokens.every((t) => name.includes(t));
  });
  const top = limitResults(matched, 8, 8);
  const results = top.map((c) => clientToQaResult(c, "Name match in your book", evidenceForClient(c)));
  const first = top[0];
  return {
    question,
    intent: match.intent,
    confidence: match.confidence,
    headline: top.length ? `I found ${top.length} name ${top.length === 1 ? "match" : "matches"}.` : "No name match in your book.",
    answerText: first
      ? `${first.clientName} is in your book${first.services[0] ? ` with ${first.services[0]}` : ""}.`
      : "Try the full first name or ask about a service group.",
    results,
    suggestedAction: first ? suggestedActionForIntent("best_clients", first) : undefined,
    followUpPrompt: "Want me to find similar clients or a service group?",
  };
}

export function answerOpportunityQuery(params: AnswerParams): SalonQaAnswer {
  const match = matchSalonQuery(params.question);
  if (match.queryMode !== "opportunity") {
    return buildUnknownAnswer(params.question, match);
  }
  const clients = buildSalonClientIndex(params.analysis);

  if (match.intent === "unknown") {
    return buildUnknownAnswer(params.question, match);
  }

  let answer: SalonQaAnswerBody;
  switch (match.intent as SalonQueryIntent) {
    case "pcn_candidates":
      answer = buildPcnAnswer(params.question, match, clients);
      break;
    case "first_20_pcn":
      answer = buildPcnAnswer(params.question, match, clients, 20);
      break;
    case "first_50_pcn":
      answer = buildPcnAnswer(params.question, match, clients, 50);
      break;
    case "best_clients":
      answer = buildBestClientsAnswer(params.question, match, clients);
      break;
    case "top_spenders":
      answer = buildTopSpendersAnswer(params.question, match, clients);
      break;
    case "frequent_clients":
      answer = buildFrequentClientsAnswer(params.question, match, clients);
      break;
    case "lapsed_clients":
      answer = buildLapsedOrOverdueAnswer(params.question, match, clients, "lapsed");
      break;
    case "overdue_clients":
      answer = buildLapsedOrOverdueAnswer(params.question, match, clients, "overdue");
      break;
    case "referral_candidates":
      answer = buildReferralAnswer(params.question, match, clients);
      break;
    case "vip_candidates": {
      const vipClients = clients.filter((c) => c.isVip);
      answer = buildBestClientsAnswer(
        params.question,
        match,
        vipClients.length > 0 ? vipClients : clients,
      );
      break;
    }
    case "birthday_candidates":
      answer = buildBirthdayAnswer(params.question, match, clients);
      break;
    case "open_slot_candidates":
      answer = buildOpenSlotAnswer(params.question, match, clients);
      break;
    case "upgrade_candidates":
      answer = buildUpgradeAnswer(params.question, match, clients);
      break;
    case "service_search":
      answer = buildServiceSearchAnswer(params.question, match, clients);
      break;
    case "client_search":
      answer = buildClientSearchAnswer(params.question, match, clients);
      break;
    default:
      return buildUnknownAnswer(params.question, match);
  }

  return {
    ...enrichSalonQaAnswer(answer, match.intent as SalonQueryIntent, match.limit),
    queryMode: "opportunity",
  } as SalonQaAnswer;
}

export function salonQaAnswerContainsForbiddenLanguage(answer: SalonQaAnswer): boolean {
  const hay = [
    answer.headline,
    answer.answerText,
    answer.followUpPrompt,
    ...answer.results.map((r) => `${r.reason} ${r.evidence.join(" ")}`),
  ]
    .join(" ")
    .toLowerCase();
  return [
    "database",
    "query",
    "segmentation",
    "detected record",
    "user cohort",
    "campaign automation",
    "marketing list",
  ].some((word) => hay.includes(word));
}
