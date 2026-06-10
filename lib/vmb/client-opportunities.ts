import { normalizeVmbBookAnalysisResult } from "@/lib/vmb/normalize-analysis";
import type {
  VmbBookAnalysisResult,
  VmbBookOpportunity,
  VmbTrustedIntroOpportunity,
} from "@/types/vmb/book-analysis";

export type ClientOpportunityTrigger =
  | "Reactivation"
  | "Birthday"
  | "VIP"
  | "Referral"
  | "Trusted Intro"
  | "Event Client"
  | "Bridal Client"
  | "High Spend"
  | "Frequent Visitor"
  | "Lapsed";

export type ClientOpportunityAction =
  | "We Miss You"
  | "Birthday Offer"
  | "Private Client Invite"
  | "Bring A Friend"
  | "Ask For Intro"
  | "Event Follow-Up"
  | "Bridal Anniversary";

export type ClientOpportunityRow = {
  id: string;
  clientName: string;
  trigger: string;
  triggerType: ClientOpportunityTrigger;
  action: ClientOpportunityAction;
  value: number;
  opportunityType: string;
  confidence: "low" | "medium" | "high";
  suggestedMessage: string;
  secondaryBadges?: string[];
  suggestedCampaign: string;
  lastVisit?: string;
  lastService?: string;
  lifetimeSpend?: number;
  potentialRevenue: number;
};

export type ClientOpportunitySummary = {
  clientsAnalyzed: number;
  recoverableRevenue: number;
  reactivationCount: number;
  referralCount: number;
  giftCount: number;
  trustedIntroCount: number;
  rows: ClientOpportunityRow[];
};

function firstName(clientName: string): string {
  return clientName.trim().split(/\s+/)[0] || clientName;
}

function parseDaysInactive(summary: string): number | null {
  const match = summary.match(/(\d+)\s+days?\s+ago/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function parseVisitCount(summary: string): number | null {
  const match = summary.match(/(\d+)\s+visits?/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function parseServiceName(summary: string): string | undefined {
  const match = summary.match(/Service "([^"]+)"/i);
  return match?.[1];
}

function actionForTrigger(trigger: ClientOpportunityTrigger): ClientOpportunityAction {
  switch (trigger) {
    case "Birthday":
      return "Birthday Offer";
    case "VIP":
    case "High Spend":
      return "Private Client Invite";
    case "Referral":
    case "Frequent Visitor":
      return "Bring A Friend";
    case "Trusted Intro":
      return "Ask For Intro";
    case "Event Client":
      return "Event Follow-Up";
    case "Bridal Client":
      return "Bridal Anniversary";
    case "Reactivation":
    case "Lapsed":
    default:
      return "We Miss You";
  }
}

function campaignForAction(action: ClientOpportunityAction): string {
  switch (action) {
    case "Birthday Offer":
      return "Birthday celebration offer";
    case "Private Client Invite":
      return "VIP private client network";
    case "Bring A Friend":
      return "Referral invitation";
    case "Ask For Intro":
      return "Trusted beauty circle intro";
    case "Event Follow-Up":
      return "Event follow-up campaign";
    case "Bridal Anniversary":
      return "Bridal anniversary outreach";
    case "We Miss You":
    default:
      return "Win-back reactivation";
  }
}

function buildSuggestedMessage(clientName: string, action: ClientOpportunityAction): string {
  const name = firstName(clientName);
  switch (action) {
    case "Birthday Offer":
      return `${name},\nYour birthday is coming up and I wanted to reach out with something special just for you.\nWould love to celebrate with you at the salon.`;
    case "Private Client Invite":
      return `${name},\nYou're one of my favorite clients and I'm inviting a small group into my private client network.\nI'd love to have you as part of it.`;
    case "Bring A Friend":
      return `${name},\nI hope you've been loving your visits with us.\nIf you know someone who would love what we do, I'd be grateful for the introduction.`;
    case "Ask For Intro":
      return `${name},\nI'm building a trusted beauty circle and thought of you.\nDo you have a provider you absolutely love for nails, skin, or massage?`;
    case "Event Follow-Up":
      return `${name},\nHope your event went beautifully.\nI'd love to help you keep that glow going with your next visit.`;
    case "Bridal Anniversary":
      return `${name},\nThinking of your bridal celebration — I'd love to reconnect and help with your next milestone moment.`;
    case "We Miss You":
    default:
      return `${name},\nIt's been a while since I've seen you.\nI'm building a private client network and wanted to invite you back with a special offer.\nWould love to see you again.`;
  }
}

function mapReactivationRow(opp: VmbBookOpportunity): ClientOpportunityRow {
  const days = parseDaysInactive(opp.summary);
  const triggerType: ClientOpportunityTrigger =
    days && days > 90 ? "Lapsed" : "Reactivation";
  const action = actionForTrigger(triggerType);
  const trigger =
    days && days > 0 ? `${days} days inactive` : "No recent visit on file";

  return {
    id: opp.id,
    clientName: opp.clientName,
    trigger,
    triggerType,
    action,
    value: opp.estimatedValue,
    opportunityType: "Reactivation",
    confidence: opp.confidence,
    suggestedCampaign: campaignForAction(action),
    suggestedMessage: buildSuggestedMessage(opp.clientName, action),
    lastVisit: days ? `${days} days ago` : undefined,
    potentialRevenue: opp.estimatedValue,
    lifetimeSpend: opp.estimatedValue,
  };
}

function mapReferralRow(opp: VmbBookOpportunity): ClientOpportunityRow {
  const visits = parseVisitCount(opp.summary);
  const isVip = opp.estimatedValue >= 200 || (visits ?? 0) >= 5;
  const isFrequent = (visits ?? 0) >= 3;
  const triggerType: ClientOpportunityTrigger = isVip
    ? "VIP"
    : isFrequent
      ? "Frequent Visitor"
      : "Referral";
  const action = actionForTrigger(triggerType);
  const trigger = isVip
    ? "VIP spender"
    : isFrequent
      ? "Favorite client"
      : "Strong referral potential";

  return {
    id: opp.id,
    clientName: opp.clientName,
    trigger,
    triggerType,
    action,
    value: opp.estimatedValue,
    opportunityType: "Referral",
    confidence: opp.confidence,
    suggestedCampaign: campaignForAction(action),
    suggestedMessage: buildSuggestedMessage(opp.clientName, action),
    lastService: visits ? `${visits} visits on file` : undefined,
    potentialRevenue: opp.estimatedValue,
    lifetimeSpend: opp.estimatedValue,
  };
}

function mapGiftRow(opp: VmbBookOpportunity): ClientOpportunityRow {
  const summaryLower = opp.summary.toLowerCase();
  const service = parseServiceName(opp.summary);
  let triggerType: ClientOpportunityTrigger = "Event Client";
  let trigger = "Celebration moment";

  if (summaryLower.includes("bridal")) {
    triggerType = "Bridal Client";
    trigger = "Bridal client";
  } else if (summaryLower.includes("birthday")) {
    triggerType = "Birthday";
    trigger = "Birthday next week";
  } else if (summaryLower.includes("gift")) {
    trigger = "Gift opportunity";
  } else if (opp.estimatedValue >= 200) {
    triggerType = "High Spend";
    trigger = "High spend visit";
  } else if (summaryLower.includes("event") || summaryLower.includes("package")) {
    triggerType = "Event Client";
    trigger = "Event client";
  }

  const action = actionForTrigger(triggerType);

  return {
    id: opp.id,
    clientName: opp.clientName,
    trigger,
    triggerType,
    action,
    value: opp.estimatedValue,
    opportunityType: "Gift",
    confidence: opp.confidence,
    suggestedCampaign: campaignForAction(action),
    suggestedMessage: buildSuggestedMessage(opp.clientName, action),
    lastService: service,
    potentialRevenue: opp.estimatedValue,
    lifetimeSpend: opp.estimatedValue,
  };
}

function trustedIntroValue(intro: VmbTrustedIntroOpportunity): number {
  const base = 140;
  const bump = intro.introCategory.length * 8;
  return base + bump;
}

function mapTrustedIntroRow(intro: VmbTrustedIntroOpportunity): ClientOpportunityRow {
  const action: ClientOpportunityAction = "Ask For Intro";
  const value = trustedIntroValue(intro);
  return {
    id: intro.id,
    clientName: intro.clientName,
    trigger: "Favorite client",
    triggerType: "Trusted Intro",
    action,
    value,
    opportunityType: "Trusted Intro",
    confidence: "medium",
    suggestedCampaign: campaignForAction(action),
    suggestedMessage: buildSuggestedMessage(intro.clientName, action),
    lastService: `${intro.introCategory} intro`,
    potentialRevenue: value,
  };
}

function dedupeRowsByClient(rows: ClientOpportunityRow[]): ClientOpportunityRow[] {
  const groups = new Map<string, ClientOpportunityRow[]>();

  for (const row of rows) {
    const key = row.clientName.trim().toLowerCase();
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }

  const deduped: ClientOpportunityRow[] = [];
  for (const group of Array.from(groups.values())) {
    const sorted = [...group].sort((a, b) => b.value - a.value);
    const [primary, ...rest] = sorted;
    const secondaryBadges = Array.from(
      new Set(rest.map((row) => row.opportunityType.replace(/^Trusted Intro · /, "Trusted Intro"))),
    );
    deduped.push({
      ...primary,
      secondaryBadges: secondaryBadges.length > 0 ? secondaryBadges : undefined,
    });
  }

  return deduped.sort((a, b) => b.value - a.value);
}

export function buildClientOpportunities(
  raw: VmbBookAnalysisResult,
): ClientOpportunitySummary {
  const analysis = normalizeVmbBookAnalysisResult(raw);
  if (!analysis) {
    return {
      clientsAnalyzed: 0,
      recoverableRevenue: 0,
      reactivationCount: 0,
      referralCount: 0,
      giftCount: 0,
      trustedIntroCount: 0,
      rows: [],
    };
  }

  const allRows: ClientOpportunityRow[] = [
    ...analysis.reactivationTargets.map(mapReactivationRow),
    ...analysis.referralOpportunities.map(mapReferralRow),
    ...analysis.giftOpportunities.map(mapGiftRow),
    ...analysis.trustedProviderIntroOpportunities.map(mapTrustedIntroRow),
  ];

  const rows = dedupeRowsByClient(allRows);

  const trustedIntroClients = new Set(
    analysis.trustedProviderIntroOpportunities.map((i) => i.clientName),
  );

  return {
    clientsAnalyzed: analysis.recordCount,
    recoverableRevenue: analysis.estimatedRecoverableRevenue,
    reactivationCount: analysis.reactivationTargets.length,
    referralCount: analysis.referralOpportunities.length,
    giftCount: analysis.giftOpportunities.length,
    trustedIntroCount: trustedIntroClients.size,
    rows,
  };
}
