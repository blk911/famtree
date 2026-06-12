import type { ClientOpportunityRow } from "@/lib/vmb/client-opportunities";
import type { CodaSearchResult, TaikosInsight } from "./types";

type SearchIntent =
  | "name"
  | "bridal"
  | "referral"
  | "upgrade"
  | "lapsed"
  | "service"
  | "general";

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function detectIntent(query: string): SearchIntent {
  if (/bride|bridal|wedding/.test(query)) return "bridal";
  if (/referral|refer/.test(query)) return "referral";
  if (/upgrade|vip|high spend|best/.test(query)) return "upgrade";
  if (/haven't seen|havent seen|lately|inactive|lapsed|overdue/.test(query)) return "lapsed";
  if (/nail|dip|balayage|color|service|gloss|haircut|spa/.test(query)) return "service";
  if (query.length <= 30 && !/\?/.test(query)) return "name";
  return "general";
}

function rowMatchesService(row: ClientOpportunityRow, tokens: string[]): boolean {
  const hay = `${row.lastService ?? ""} ${row.trigger} ${row.opportunityType}`.toLowerCase();
  return tokens.some((t) => hay.includes(t));
}

function extractServiceTokens(query: string): string[] {
  const known = ["dip nails", "dip", "nails", "balayage", "gloss", "color", "haircut", "spa", "bridal"];
  return known.filter((k) => query.includes(k));
}

export function searchClientIndex(
  rawQuery: string,
  rows: ClientOpportunityRow[],
  insights: TaikosInsight[] = [],
): CodaSearchResult {
  const query = normalizeQuery(rawQuery);
  if (!query) {
    return { query: rawQuery, matches: [] };
  }

  const intent = detectIntent(query);
  const serviceTokens = extractServiceTokens(query);
  const insightByClient = new Map(
    insights.map((i) => [i.subjectName.trim().toLowerCase(), i.id]),
  );

  const scored = rows
    .map((row) => {
      const nameLower = row.clientName.toLowerCase();
      let score = 0;
      let matchReason = "Matches your book";

      switch (intent) {
        case "bridal":
          if (row.triggerType === "Bridal Client" || /bridal|wedding|event/i.test(row.lastService ?? "")) {
            score = 90;
            matchReason = "Bridal or wedding client";
          }
          break;
        case "referral":
          if (row.triggerType === "Referral" || row.triggerType === "VIP" || row.triggerType === "Frequent Visitor") {
            score = 85;
            matchReason = "Strong referral potential";
          }
          break;
        case "upgrade":
          if (row.triggerType === "VIP" || row.triggerType === "High Spend" || row.value >= 150) {
            score = 82;
            matchReason = "High-value upgrade candidate";
          }
          break;
        case "lapsed":
          if (row.triggerType === "Reactivation" || row.triggerType === "Lapsed") {
            score = 88;
            matchReason = "Hasn't been in lately";
          }
          break;
        case "service":
          if (serviceTokens.length > 0 && rowMatchesService(row, serviceTokens)) {
            score = 86;
            matchReason = `Service match: ${serviceTokens.join(", ")}`;
          }
          break;
        case "name":
          if (nameLower.includes(query) || query.split(/\s+/).every((w) => nameLower.includes(w))) {
            score = 95;
            matchReason = "Name match";
          }
          break;
        default:
          if (nameLower.includes(query)) {
            score = 70;
            matchReason = "Partial name match";
          } else if (rowMatchesService(row, query.split(/\s+/).filter((w) => w.length > 2))) {
            score = 65;
            matchReason = "Related service or note";
          }
      }

      return { row, score, matchReason };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return {
    query: rawQuery,
    matches: scored.map(({ row, matchReason }) => ({
      clientName: row.clientName,
      subjectLabel: row.triggerType,
      matchReason,
      lastService: row.lastService,
      lastVisit: row.lastVisit,
      insightId: insightByClient.get(row.clientName.trim().toLowerCase()),
    })),
  };
}
