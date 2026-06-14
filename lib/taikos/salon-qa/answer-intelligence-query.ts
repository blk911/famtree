import type { VmbBookRecord } from "@/types/vmb/provider-ingest";
import { dateInRange, parseSalonDateRange } from "./date-parser";
import type {
  SalonIntelligenceAnswer,
  SalonQaAnswer,
  SalonQaSuggestedAction,
  SalonQueryMatch,
} from "./types";

type Params = {
  question: string;
  match: SalonQueryMatch;
  records: VmbBookRecord[];
};

function formatCurrency(amount: number): string {
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

function formatDate(iso?: string): string {
  if (!iso?.trim()) return "Unknown";
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return iso;
  return new Date(parsed).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function recordsInRange(records: VmbBookRecord[], question: string): VmbBookRecord[] {
  const range = parseSalonDateRange(question);
  if (!range) return records;
  return records.filter((r) => dateInRange(r.lastVisitDate, range));
}

function uniqueClientNames(records: VmbBookRecord[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const r of records) {
    const key = r.clientName.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    names.push(r.clientName.trim());
  }
  return names.sort((a, b) => a.localeCompare(b));
}

function serviceCounts(records: VmbBookRecord[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const r of records) {
    const service = r.serviceName?.trim();
    if (!service) continue;
    counts.set(service, (counts.get(service) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function recordsMatchingService(records: VmbBookRecord[], keyword?: string): VmbBookRecord[] {
  if (!keyword?.trim()) return records;
  const needle = keyword.trim().toLowerCase();
  return records.filter((r) => (r.serviceName ?? "").toLowerCase().includes(needle));
}

function periodLabel(question: string): string {
  const range = parseSalonDateRange(question);
  if (!range) return "that period";
  return range.label.split(" ")[0] ?? range.label;
}

function buildIntelligenceSuggestedAction(
  intent: SalonQueryMatch["intent"],
  question: string,
): SalonQaSuggestedAction | undefined {
  const month = periodLabel(question);

  switch (intent) {
    case "monthly_clients":
      return {
        kind: "follow_up_query",
        label: `Find who never returned after ${month}`,
        question: `Who disappeared after ${month}?`,
      };
    case "service_popularity":
      return {
        kind: "follow_up_query",
        label: "Find clients due for those services",
        question: "Who is due for my top services?",
      };
    case "repeat_clients":
      return {
        kind: "follow_up_query",
        label: "Find which repeat clients should join PCN",
        question: "Which repeat clients should join my PCN?",
      };
    case "revenue_period":
      return {
        kind: "follow_up_query",
        label: "Find VIP invite candidates",
        question: "Who should receive a VIP thank-you?",
      };
    case "inactive_period":
      return {
        kind: "follow_up_query",
        label: "Preview reactivation candidates",
        question: "Who should I reconnect with?",
      };
    default:
      return undefined;
  }
}

function buildIntelligencePayload(
  question: string,
  match: SalonQueryMatch,
  records: VmbBookRecord[],
): SalonIntelligenceAnswer {
  const range = parseSalonDateRange(question);
  const rangeLabel = range?.label ?? "your book";

  switch (match.intent) {
    case "monthly_clients": {
      const inRange = recordsInRange(records, question);
      const names = uniqueClientNames(inRange);
      const services = serviceCounts(inRange).slice(0, 5).map((s) => s.name);
      return {
        headline: range ? `${range.label.split(" ")[0]} Clients` : "Clients In Period",
        summary: `I found ${names.length} client${names.length === 1 ? "" : "s"} who visited in ${rangeLabel}.`,
        rows: names.slice(0, 12).map((name) => ({ name })),
        metrics: services.length
          ? [{ label: "Services", value: services.join(", ") }]
          : undefined,
        followUpPrompt: range
          ? `Would you like me to find clients who never returned after ${range.label.split(" ")[0]}?`
          : "Would you like me to find clients who never returned after that period?",
      };
    }

    case "monthly_revenue": {
      const inRange = recordsInRange(records, question);
      const revenue = inRange.reduce((sum, r) => sum + (r.amountSpent ?? 0), 0);
      const clients = uniqueClientNames(inRange).length;
      return {
        headline: range ? `${range.label} Overview` : "Period Overview",
        summary: `In ${rangeLabel}, ${clients} client${clients === 1 ? "" : "s"} visited with about ${formatCurrency(revenue)} in visit value.`,
        metrics: [
          { label: "Clients", value: String(clients) },
          { label: "Visit value", value: formatCurrency(revenue) },
        ],
        followUpPrompt: "Would you like to see who drove most of that revenue?",
      };
    }

    case "service_popularity": {
      const ranked = serviceCounts(records);
      return {
        headline: "Top Services",
        summary:
          ranked.length > 0
            ? `Here are the most booked services in your book.`
            : "I do not see service names in this export yet.",
        rows: ranked.slice(0, 8).map((s, i) => ({
          name: `${i + 1}. ${s.name}`,
          detail: `${s.count} visit${s.count === 1 ? "" : "s"}`,
        })),
        followUpPrompt: "Would you like to find clients due for these services?",
      };
    }

    case "repeat_clients": {
      const threshold = match.repeatVisitThreshold ?? 2;
      const repeat = records.filter((r) => (r.visitCount ?? 0) >= threshold);
      const names = uniqueClientNames(repeat);
      return {
        headline: "Repeat Clients",
        summary: `${names.length} client${names.length === 1 ? "" : "s"} visited at least ${threshold} times.`,
        rows: names.slice(0, 12).map((name) => {
          const record = records.find((r) => r.clientName === name);
          return {
            name,
            detail: record?.visitCount ? `${record.visitCount} visits` : undefined,
          };
        }),
        followUpPrompt: "Would you like me to find who has not been back recently among them?",
      };
    }

    case "client_count": {
      const count = uniqueClientNames(records).length;
      return {
        headline: "Client Count",
        summary: `Your book includes ${count} unique client${count === 1 ? "" : "s"}.`,
        metrics: [{ label: "Unique clients", value: String(count) }],
        followUpPrompt: "Would you like to see who visited most recently?",
      };
    }

    case "service_search_period": {
      const inRange = recordsInRange(records, question);
      const matched = recordsMatchingService(inRange, match.serviceKeyword);
      const names = uniqueClientNames(matched);
      const label = match.serviceKeyword ?? "that service";
      return {
        headline: `${label} Clients`,
        summary: `I found ${names.length} client${names.length === 1 ? "" : "s"} connected to ${label} in ${rangeLabel}.`,
        rows: names.slice(0, 12).map((name) => ({ name })),
        followUpPrompt: `Would you like me to find who is due for ${label} again?`,
      };
    }

    case "revenue_period": {
      const threshold = match.revenueThreshold;
      let filtered = [...records];
      if (threshold !== undefined) {
        filtered = filtered.filter((r) => (r.amountSpent ?? 0) >= threshold);
      } else {
        filtered.sort((a, b) => (b.amountSpent ?? 0) - (a.amountSpent ?? 0));
        filtered = filtered.slice(0, 8);
      }
      const names = uniqueClientNames(filtered);
      return {
        headline: threshold ? `Clients Over ${formatCurrency(threshold)}` : "Top Spenders",
        summary: threshold
          ? `${names.length} client${names.length === 1 ? "" : "s"} spent over ${formatCurrency(threshold)}.`
          : `Here are your highest-value clients by visit spend.`,
        rows: names.slice(0, 10).map((name) => {
          const record = records.find((r) => r.clientName === name);
          return {
            name,
            detail: record?.amountSpent ? formatCurrency(record.amountSpent) : undefined,
          };
        }),
        followUpPrompt: "Would you like me to find who deserves a thank-you note?",
      };
    }

    case "inactive_period": {
      const cutoff = range?.end;
      const inactive = records.filter((r) => {
        if (!cutoff || !r.lastVisitDate) return false;
        const visit = Date.parse(r.lastVisitDate);
        return !Number.isNaN(visit) && visit <= cutoff.getTime();
      });
      const names = uniqueClientNames(inactive);
      return {
        headline: "Inactive After Period",
        summary: `${names.length} client${names.length === 1 ? "" : "s"} last visited on or before ${rangeLabel}.`,
        rows: names.slice(0, 12).map((name) => {
          const record = records.find((r) => r.clientName === name);
          return { name, detail: record?.lastVisitDate ? `Last visit ${formatDate(record.lastVisitDate)}` : undefined };
        }),
        followUpPrompt: "Would you like me to build a reactivation list from these names?",
      };
    }

    default:
      return {
        headline: "Book Insight",
        summary: "I can help summarize visits, services, and spend from your book.",
        followUpPrompt: "Try asking about a month, popular services, or repeat visitors.",
      };
  }
}

export function answerIntelligenceQuery(params: Params): SalonQaAnswer {
  const intelligence = buildIntelligencePayload(params.question, params.match, params.records);
  const suggestedAction = buildIntelligenceSuggestedAction(params.match.intent, params.question);
  return {
    question: params.question,
    queryMode: "intelligence",
    intent: params.match.intent,
    confidence: params.match.confidence,
    headline: intelligence.headline,
    answerText: intelligence.summary,
    results: (intelligence.rows ?? []).map((row) => ({
      clientName: row.name.replace(/^\d+\.\s*/, ""),
      reason: row.detail ?? "In your book",
      evidence: [],
    })),
    suggestedAction,
    suggestedCards: [],
    followUpPrompt: intelligence.followUpPrompt ?? "What else would you like to know about your book?",
    intelligence,
  };
}
