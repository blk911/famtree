import { SALON_QUERY_CATALOG } from "./salon-query-catalog";
import type { SalonQueryIntent, SalonQueryMatch } from "./types";

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
  { pattern: /spend|spender|ticket|revenue/, intent: "top_spenders", boost: 0.2 },
  { pattern: /referral|refer|intro|ambassador/, intent: "referral_candidates", boost: 0.25 },
  { pattern: /open(ing| slot| chair)|fill.*(slot|opening|spot)/, intent: "open_slot_candidates", boost: 0.25 },
  { pattern: /upgrade|add-?on|premium/, intent: "upgrade_candidates", boost: 0.2 },
  { pattern: /frequent|often|regular/, intent: "frequent_clients", boost: 0.2 },
  { pattern: /best client|top client|favorite/, intent: "best_clients", boost: 0.2 },
  { pattern: /\bvip\b/, intent: "vip_candidates", boost: 0.25 },
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
  const whoGets = normalized.match(/who (?:gets|had|came in for|books?) (.+?)(?:\?|$)/);
  if (whoGets?.[1]) {
    const phrase = whoGets[1].trim().replace(/\?.*$/, "");
    if (phrase.length >= 3 && phrase.length <= 40) return phrase;
  }
  return undefined;
}

function looksLikeClientSearch(text: string): boolean {
  const normalized = normalize(text);
  if (/^who is\s+.+/i.test(text.trim())) return true;
  if (/^find\s+.+/i.test(text.trim())) return true;
  if (normalized.length <= 24 && !/\?/.test(text) && !/who |what |which |how /.test(normalized)) {
    return normalized.split(" ").length <= 3;
  }
  return false;
}

function extractClientNameHint(text: string): string | undefined {
  const whoIs = text.trim().match(/^who is\s+(.+?)\??$/i);
  if (whoIs?.[1]) return whoIs[1].trim();
  const find = text.trim().match(/^find\s+(.+?)\??$/i);
  if (find?.[1]) return find[1].trim();
  if (looksLikeClientSearch(text) && !text.includes("?")) return text.trim();
  return undefined;
}

function scoreTemplate(normalized: string, alias: string): number {
  if (normalized === alias) return 1;
  if (normalized.includes(alias)) return 0.85 + alias.length / 200;
  const aliasTokens = alias.split(" ").filter(Boolean);
  const matched = aliasTokens.filter((t) => normalized.includes(t)).length;
  if (matched === 0) return 0;
  return (matched / aliasTokens.length) * 0.75;
}

export function matchSalonQuery(input: string): SalonQueryMatch {
  const original = input.trim();
  const normalized = normalize(original);
  const limit = extractLimit(original);
  const serviceKeyword = extractServiceKeyword(original);

  if (serviceKeyword || /who (gets|had|came in for|books?)/i.test(original)) {
    return {
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
      intent: "first_50_pcn",
      confidence: 0.9,
      limit: 50,
      original,
      category: "pcn",
      templateId: "pcn-first-50",
    };
  }

  let best: SalonQueryMatch = { intent: "unknown", confidence: 0, original };

  for (const template of SALON_QUERY_CATALOG) {
    for (const alias of template.aliases) {
      const score = scoreTemplate(normalized, alias);
      if (score > best.confidence) {
        best = {
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

  const clientNameHint = extractClientNameHint(original);
  if (clientNameHint) {
    return {
      intent: "client_search",
      confidence: 0.88,
      clientNameHint,
      original,
      category: "clients",
    };
  }

  return { intent: "unknown", confidence: 0.2, original };
}
