import { SALON_QUERY_CATALOG } from "./salon-query-catalog";
import type { SalonIntelligenceIntent, SalonQueryIntent, SalonQueryMatch } from "./types";

const SERVICE_KEYWORDS = [
  "gel-x",
  "gel x",
  "gelx",
  "balayage",
  "dip nails",
  "dip",
  "nails",
  "manicure",
  "pedicure",
  "facial",
  "wax",
  "lash",
  "blowout",
  "color",
  "highlights",
  "extensions",
  "bridal",
  "massage",
] as const;

const CATEGORY_INTENT_HINTS: Array<{ pattern: RegExp; intent: SalonQueryIntent; boost: number }> = [
  { pattern: /\bpcn\b|private client/, intent: "pcn_candidates", boost: 0.25 },
  { pattern: /birthday/, intent: "birthday_candidates", boost: 0.3 },
  { pattern: /overdue|past due|rebook/, intent: "overdue_clients", boost: 0.25 },
  { pattern: /lapsed|hasn't been|hasnt been|inactive|drift/, intent: "lapsed_clients", boost: 0.25 },
  { pattern: /referral|refer|intro|ambassador/, intent: "referral_candidates", boost: 0.25 },
  { pattern: /open(ing| slot| chair)|fill.*(slot|opening|spot)/, intent: "open_slot_candidates", boost: 0.25 },
  { pattern: /upgrade|add-?on|premium/, intent: "upgrade_candidates", boost: 0.2 },
  { pattern: /frequent|often|regular/, intent: "frequent_clients", boost: 0.2 },
  { pattern: /best client|top client|favorite/, intent: "best_clients", boost: 0.2 },
  { pattern: /\bvip\b/, intent: "vip_candidates", boost: 0.25 },
  { pattern: /thank.?you|thank you note/, intent: "pcn_candidates", boost: 0.2 },
];

function normalize(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

function extractLimit(text: string): number | undefined {
  const match = text.match(/(?:first|top)\s+(\d{1,3})/i);
  if (!match) return undefined;
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function extractServiceKeyword(text: string): string | undefined {
  const normalized = normalize(text);
  for (const keyword of SERVICE_KEYWORDS) {
    if (normalized.includes(keyword)) return keyword;
  }
  const whoGets = normalized.match(
    /who (?:gets|got|had|came in for|books?|received) (.+?)(?:\?|$|this year|last month|in )/,
  );
  if (whoGets?.[1]) {
    const phrase = whoGets[1].trim().replace(/\?.*$/, "");
    if (phrase.length >= 3 && phrase.length <= 40) return phrase;
  }
  const whatServices = normalized.match(/what services did .+ receive/);
  if (whatServices) return undefined;
  return undefined;
}

function extractClientNameFromPatterns(text: string): string | undefined {
  const trimmed = text.trim();
  const tellMe = trimmed.match(/^tell me about\s+(.+?)\??$/i);
  if (tellMe?.[1]) return tellMe[1].trim();
  const showHistory = trimmed.match(/^show\s+(.+?)['']s history\??$/i);
  if (showHistory?.[1]) return showHistory[1].trim();
  const servicesReceived = trimmed.match(/^what services did\s+(.+?)\s+receive\??$/i);
  if (servicesReceived?.[1]) return servicesReceived[1].trim();
  const whoIs = trimmed.match(/^who is\s+(.+?)\??$/i);
  if (whoIs?.[1]) return whoIs[1].trim();
  return undefined;
}

function isClientLookupQuery(text: string): boolean {
  const normalized = normalize(text);
  if (/^tell me about\s+.+/i.test(text.trim())) return true;
  if (/^show\s+.+'s history/i.test(text.trim())) return true;
  if (/^what services did\s+.+\s+receive/i.test(text.trim())) return true;
  return false;
}

function isIntelligenceQuery(text: string): SalonIntelligenceIntent | undefined {
  const normalized = normalize(text);

  if (
    /\b(most popular|top services|popular services|which services were)\b/.test(normalized) ||
    /what were my most popular services/.test(normalized)
  ) {
    return "service_popularity";
  }

  if (
    /\b(how many clients|client count|total clients|how many people)\b/.test(normalized) &&
    !/\bpcn\b|invite|overdue/.test(normalized)
  ) {
    return "client_count";
  }

  if (
    /\b(twice|two times|2 times|2 visits|visited twice|came twice|repeat clients?)\b/.test(normalized)
  ) {
    return "repeat_clients";
  }

  if (
    /\b(spent the most|spend the most|top spenders?|highest spend|who spent over|spent over \$)\b/.test(
      normalized,
    )
  ) {
    return "revenue_period";
  }

  if (/\b(disappeared|never returned|stopped coming|went quiet|fell off)\b/.test(normalized)) {
    return "inactive_period";
  }

  if (
    /\b(what happened last month|revenue last month|how did .* last month)\b/.test(normalized) ||
    (/\blast month\b/.test(normalized) && /\b(revenue|happened|summary|overview)\b/.test(normalized))
  ) {
    return "monthly_revenue";
  }

  if (
    /\b(who were my|who came in|who visited|clients in|came in during|who got .+ this year|who had .+ in)\b/.test(
      normalized,
    ) ||
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(
      normalized,
    ) ||
    /\b(this month|last month|this year)\b/.test(normalized)
  ) {
    if (extractServiceKeyword(text) && /\b(this year|last month|january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(normalized)) {
      return "service_search_period";
    }
    if (/\b(revenue|spent|sales)\b/.test(normalized) && !/\bwho spent the most\b/.test(normalized)) {
      return "monthly_revenue";
    }
    if (/\bclients?\b/.test(normalized) || /\bwho came\b/.test(normalized) || /\bwho got\b/.test(normalized)) {
      return "monthly_clients";
    }
  }

  if (
    extractServiceKeyword(text) &&
    /\b(this year|last month|this month|january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(
      normalized,
    )
  ) {
    return "service_search_period";
  }

  return undefined;
}

function extractRevenueThreshold(text: string): number | undefined {
  const match = text.match(/(?:over|above|more than)\s+\$?\s*(\d+)/i);
  if (!match) return undefined;
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) ? n : undefined;
}

function scoreTemplate(normalized: string, alias: string): number {
  if (normalized === alias) return 1;
  if (normalized.includes(alias)) return 0.85 + alias.length / 200;
  const aliasTokens = alias.split(" ").filter(Boolean);
  const matched = aliasTokens.filter((t) => normalized.includes(t)).length;
  if (matched === 0) return 0;
  return (matched / aliasTokens.length) * 0.75;
}

function opportunityMatch(input: string): SalonQueryMatch {
  const original = input.trim();
  const normalized = normalize(original);
  const limit = extractLimit(original);
  const serviceKeyword = extractServiceKeyword(original);

  if (serviceKeyword || /who (gets|had|came in for|books?)/i.test(original)) {
    return {
      queryMode: "opportunity",
      intent: "service_search",
      confidence: serviceKeyword ? 0.92 : 0.75,
      serviceKeyword,
      limit,
      original,
      category: "clients",
    };
  }

  if (limit === 20) {
    return {
      queryMode: "opportunity",
      intent: "first_20_pcn",
      confidence: 0.9,
      limit: 20,
      original,
      category: "pcn",
      templateId: "pcn-first-20",
    };
  }
  if (limit === 50) {
    return {
      queryMode: "opportunity",
      intent: "first_50_pcn",
      confidence: 0.9,
      limit: 50,
      original,
      category: "pcn",
      templateId: "pcn-first-50",
    };
  }

  let best: SalonQueryMatch = {
    queryMode: "opportunity",
    intent: "unknown",
    confidence: 0,
    original,
  };

  for (const template of SALON_QUERY_CATALOG) {
    for (const alias of template.aliases) {
      const score = scoreTemplate(normalized, alias);
      if (score > best.confidence) {
        best = {
          queryMode: "opportunity",
          intent: template.intent,
          confidence: score,
          templateId: template.id,
          category: template.category,
          limit:
            limit ??
            (template.intent === "first_20_pcn" ? 20 : template.intent === "first_50_pcn" ? 50 : undefined),
          original,
        };
      }
    }
  }

  for (const hint of CATEGORY_INTENT_HINTS) {
    if (hint.pattern.test(normalized)) {
      const boosted = Math.min(1, best.confidence + hint.boost);
      if (boosted >= best.confidence) {
        best = {
          ...best,
          intent: hint.intent,
          confidence: boosted,
          limit: limit ?? best.limit,
          original,
        };
      }
    }
  }

  if (best.confidence >= 0.45) {
    if (best.intent === "pcn_candidates" && limit && limit <= 50) {
      best = {
        ...best,
        intent: limit <= 20 ? "first_20_pcn" : "first_50_pcn",
        limit,
      };
    }
    return best;
  }

  return { queryMode: "opportunity", intent: "unknown", confidence: 0.2, original };
}

export function matchSalonQuery(input: string): SalonQueryMatch {
  const original = input.trim();
  const clientNameHint = extractClientNameFromPatterns(original);

  if (isClientLookupQuery(original) && clientNameHint) {
    return {
      queryMode: "client",
      intent: "client_lookup",
      confidence: 0.95,
      clientNameHint,
      original,
      category: "clients",
    };
  }

  const intelligenceIntent = isIntelligenceQuery(original);
  if (intelligenceIntent) {
    return {
      queryMode: "intelligence",
      intent: intelligenceIntent,
      confidence: 0.9,
      serviceKeyword: extractServiceKeyword(original),
      revenueThreshold: extractRevenueThreshold(original),
      repeatVisitThreshold: /\btwice\b|2 times|2 visits/.test(normalize(original)) ? 2 : undefined,
      original,
      category: "intelligence",
    };
  }

  return opportunityMatch(original);
}
