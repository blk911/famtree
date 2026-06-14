import {
  buildClientOpportunities,
  type ClientOpportunityRow,
} from "@/lib/vmb/client-opportunities";
import type { VmbBookAnalysisResult, VmbBookOpportunity } from "@/types/vmb/book-analysis";

export type EnrichedSalonClient = {
  id: string;
  clientName: string;
  rows: ClientOpportunityRow[];
  visitCount: number;
  spend: number;
  daysInactive: number | null;
  services: string[];
  triggerTypes: string[];
  maxValue: number;
  confidence: "low" | "medium" | "high";
  pcnScore: number;
  referralScore: number;
  birthdaySignal: boolean;
  isVip: boolean;
  isFrequent: boolean;
  isLapsed: boolean;
  isOverdue: boolean;
  searchText: string;
};

function parseDaysInactive(summaryOrTrigger: string | undefined): number | null {
  if (!summaryOrTrigger) return null;
  const match = summaryOrTrigger.match(/(\d+)\s+days?\s+(?:ago|inactive)/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function parseVisitCount(text: string | undefined): number {
  if (!text) return 0;
  const match = text.match(/(\d+)\s+visits?/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function parseServiceName(summary: string): string | undefined {
  const match = summary.match(/Service "([^"]+)"/i);
  return match?.[1];
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function mergeOpportunityText(client: EnrichedSalonClient, opp: VmbBookOpportunity): void {
  const service = parseServiceName(opp.summary);
  if (service && !client.services.includes(service)) {
    client.services.push(service);
  }
  client.spend = Math.max(client.spend, opp.estimatedValue);
  client.maxValue = Math.max(client.maxValue, opp.estimatedValue);
  const days = parseDaysInactive(opp.summary);
  if (days !== null) {
    client.daysInactive =
      client.daysInactive === null ? days : Math.max(client.daysInactive, days);
  }
  const visits = parseVisitCount(opp.summary);
  if (visits > client.visitCount) client.visitCount = visits;
  if (opp.summary.toLowerCase().includes("birthday")) client.birthdaySignal = true;
  if (opp.opportunityType === "reactivation") {
    client.isLapsed = true;
    client.isOverdue = true;
  }
  if (opp.opportunityType === "referral") client.referralScore += 10;
}

function scorePcn(client: EnrichedSalonClient): number {
  let score = client.maxValue * 0.4;
  if (client.isVip) score += 35;
  if (client.isFrequent) score += 25;
  if (client.referralScore > 0) score += 20;
  if (client.daysInactive !== null && client.daysInactive <= 60) score += 15;
  if (client.daysInactive !== null && client.daysInactive > 120) score -= 10;
  if (client.triggerTypes.includes("VIP") || client.triggerTypes.includes("High Spend")) score += 20;
  if (client.triggerTypes.includes("Frequent Visitor")) score += 15;
  if (client.confidence === "high") score += 8;
  return score;
}

function scoreReferral(client: EnrichedSalonClient): number {
  let score = client.referralScore;
  if (client.isVip) score += 30;
  if (client.isFrequent) score += 20;
  score += client.visitCount * 4;
  score += client.spend * 0.2;
  return score;
}

function enrichFromRow(client: EnrichedSalonClient, row: ClientOpportunityRow): void {
  client.rows.push(row);
  client.maxValue = Math.max(client.maxValue, row.value, row.potentialRevenue, row.lifetimeSpend ?? 0);
  client.spend = Math.max(client.spend, row.lifetimeSpend ?? row.value);
  if (!client.triggerTypes.includes(row.triggerType)) {
    client.triggerTypes.push(row.triggerType);
  }
  const days = parseDaysInactive(row.lastVisit ?? row.trigger);
  if (days !== null) {
    client.daysInactive =
      client.daysInactive === null ? days : Math.max(client.daysInactive, days);
  }
  const visits = parseVisitCount(row.lastService ?? row.trigger);
  if (visits > client.visitCount) client.visitCount = visits;
  if (row.lastService && !client.services.includes(row.lastService)) {
    client.services.push(row.lastService);
  }
  if (row.triggerType === "Birthday") client.birthdaySignal = true;
  if (row.triggerType === "VIP" || row.triggerType === "High Spend") client.isVip = true;
  if (row.triggerType === "Frequent Visitor") client.isFrequent = true;
  if (row.triggerType === "Lapsed" || row.triggerType === "Reactivation") {
    client.isLapsed = true;
    client.isOverdue = true;
  }
  if (row.confidence === "high") client.confidence = "high";
  else if (row.confidence === "medium" && client.confidence === "low") client.confidence = "medium";
  if (row.action === "Private Client Invite") client.pcnScore += 10;
  if (row.action === "Bring A Friend") client.referralScore += 15;
}

function finalizeClient(client: EnrichedSalonClient): EnrichedSalonClient {
  client.pcnScore = scorePcn(client);
  client.referralScore = scoreReferral(client);
  client.searchText = [
    client.clientName,
    ...client.services,
    ...client.triggerTypes,
    ...client.rows.map((r) => r.trigger),
    ...client.rows.map((r) => r.opportunityType),
  ]
    .join(" ")
    .toLowerCase();
  return client;
}

export function buildSalonClientIndex(analysis: VmbBookAnalysisResult): EnrichedSalonClient[] {
  const summary = buildClientOpportunities(analysis);
  const byName = new Map<string, EnrichedSalonClient>();

  function ensure(name: string, id?: string): EnrichedSalonClient {
    const key = name.trim().toLowerCase();
    const existing = byName.get(key);
    if (existing) return existing;
    const created: EnrichedSalonClient = {
      id: id ?? `client-${key.replace(/\s+/g, "-")}`,
      clientName: name.trim(),
      rows: [],
      visitCount: 0,
      spend: 0,
      daysInactive: null,
      services: [],
      triggerTypes: [],
      maxValue: 0,
      confidence: "low",
      pcnScore: 0,
      referralScore: 0,
      birthdaySignal: false,
      isVip: false,
      isFrequent: false,
      isLapsed: false,
      isOverdue: false,
      searchText: "",
    };
    byName.set(key, created);
    return created;
  }

  for (const row of summary.rows) {
    const client = ensure(row.clientName, row.id);
    enrichFromRow(client, row);
  }

  const allOpps = [
    ...analysis.reactivationTargets,
    ...analysis.referralOpportunities,
    ...analysis.giftOpportunities,
  ];
  for (const opp of allOpps) {
    const client = ensure(opp.clientName, opp.id);
    mergeOpportunityText(client, opp);
  }

  return Array.from(byName.values()).map(finalizeClient);
}

export function clientToQaResult(
  client: EnrichedSalonClient,
  reason: string,
  evidence: string[],
  suggestedCardType?: string,
): import("./types").SalonQaResult {
  return {
    clientId: client.id,
    clientName: client.clientName,
    reason,
    evidence,
    score: client.pcnScore || client.maxValue,
    suggestedCardType,
  };
}

export { firstName };
