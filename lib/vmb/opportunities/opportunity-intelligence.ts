import { clientNameFromOpportunity } from "@/lib/taikos/workflow/opportunity-display";
import type { TaikosOpportunity } from "@/lib/taikos/opportunities/types";

export type SuggestedCardType =
  | "pcn_invite"
  | "refresh_card"
  | "reactivation_card"
  | "vip_thank_you"
  | "referral_invite"
  | "birthday_card"
  | "open_slot_fill"
  | "service_card";

export type OpportunityIntelligence = {
  opportunityId: string;
  subjectName?: string;
  insightTitle: string;
  whatTaikosSees: string;
  whyThisMatters: string;
  suggestedRelationshipMove: string;
  suggestedCardType: SuggestedCardType;
  confidence: number;
  evidence: string[];
};

export type OpportunityAnalysisContext = {
  analysisId?: string;
  salonName?: string;
  hasRealBookData?: boolean;
};

const CARD_LABELS: Record<SuggestedCardType, string> = {
  pcn_invite: "PCN invite",
  refresh_card: "Refresh card",
  reactivation_card: "Reactivation card",
  vip_thank_you: "VIP thank-you card",
  referral_invite: "Referral invite",
  birthday_card: "Birthday card",
  open_slot_fill: "Open slot fill",
  service_card: "Service card",
};

export function suggestedCardTypeLabel(type: SuggestedCardType): string {
  return CARD_LABELS[type];
}

function pronoun(name: string): string {
  return name.includes("&") || name.toLowerCase().includes("clients") ? "They" : "She";
}

function buildEvidence(opportunity: TaikosOpportunity, context: OpportunityAnalysisContext): string[] {
  const evidence: string[] = [];
  if (context.analysisId) evidence.push(`Book analysis ${context.analysisId}`);
  if (context.hasRealBookData) evidence.push("Live client book connected");
  evidence.push(`${opportunity.category} signal`);
  evidence.push(`Est. value $${opportunity.estimatedValue.toLocaleString()}`);
  if (opportunity.recommendation.trim()) {
    evidence.push(opportunity.recommendation.trim().slice(0, 120));
  }
  return evidence.slice(0, 4);
}

export function buildOpportunityIntelligence(
  opportunity: TaikosOpportunity,
  analysisContext: OpportunityAnalysisContext = {},
): OpportunityIntelligence {
  const subjectName = clientNameFromOpportunity(opportunity);
  const subject = subjectName || "This client";
  const pro = pronoun(subject);
  const evidence = buildEvidence(opportunity, analysisContext);
  const confidence = opportunity.confidence;

  const rec = opportunity.recommendation.toLowerCase();
  const isHighValue =
    opportunity.estimatedValue >= 250 ||
    rec.includes("high value") ||
    rec.includes("above-average") ||
    rec.includes("vip");

  if (
    opportunity.category === "Retention" ||
    rec.includes("refresh") ||
    rec.includes("overdue") ||
    rec.includes("normal cycle")
  ) {
    return {
      opportunityId: opportunity.opportunityId,
      subjectName,
      insightTitle: "Refresh window opening",
      whatTaikosSees: `${subject} appears to be past ${pro.toLowerCase() === "they" ? "their" : "her"} normal refresh window.`,
      whyThisMatters:
        "Clients are easier to rebook before the need feels urgent or they drift to another provider.",
      suggestedRelationshipMove: "Send a warm refresh invite.",
      suggestedCardType: "refresh_card",
      confidence,
      evidence,
    };
  }

  if (opportunity.category === "Reactivation" || rec.includes("has not returned") || rec.includes("lapsed")) {
    return {
      opportunityId: opportunity.opportunityId,
      subjectName,
      insightTitle: "Reactivation opportunity",
      whatTaikosSees: `${subject} has not returned recently, but has previous service history.`,
      whyThisMatters: "Past clients are usually easier to restart than cold leads.",
      suggestedRelationshipMove: "Send a private reconnect note.",
      suggestedCardType: "reactivation_card",
      confidence,
      evidence,
    };
  }

  if (
    opportunity.category === "Referral" ||
    opportunity.category === "PCN Invite" ||
    rec.includes("referral") ||
    rec.includes("network")
  ) {
    const card: SuggestedCardType =
      opportunity.category === "PCN Invite" ? "pcn_invite" : "referral_invite";
    return {
      opportunityId: opportunity.opportunityId,
      subjectName,
      insightTitle: "Relationship amplifier",
      whatTaikosSees: `${subject} appears connected to referral or relationship value.`,
      whyThisMatters: "Some clients are more valuable because they bring trusted people with them.",
      suggestedRelationshipMove: "Invite her into the Private Client Network first.",
      suggestedCardType: card,
      confidence,
      evidence,
    };
  }

  if (isHighValue) {
    return {
      opportunityId: opportunity.opportunityId,
      subjectName,
      insightTitle: "High-value relationship",
      whatTaikosSees: `${subject} has above-average ticket value.`,
      whyThisMatters: "High-value clients should feel seen before they feel marketed to.",
      suggestedRelationshipMove: "Send a VIP appreciation card.",
      suggestedCardType: "vip_thank_you",
      confidence,
      evidence,
    };
  }

  if (opportunity.category === "Birthday" || rec.includes("birthday") || rec.includes("celebration")) {
    return {
      opportunityId: opportunity.opportunityId,
      subjectName,
      insightTitle: "Date-based moment",
      whatTaikosSees: "Upcoming date-based relationship moment detected.",
      whyThisMatters: "Occasion-based invites feel personal instead of promotional.",
      suggestedRelationshipMove: "Prepare a birthday or celebration card.",
      suggestedCardType: "birthday_card",
      confidence,
      evidence,
    };
  }

  if (opportunity.category === "Open Slot" || rec.includes("open slot") || rec.includes("calendar gap")) {
    return {
      opportunityId: opportunity.opportunityId,
      subjectName,
      insightTitle: "Perishable chair time",
      whatTaikosSees: "There is a schedule gap that matches an easy invite opportunity.",
      whyThisMatters: "Open chair time is perishable revenue.",
      suggestedRelationshipMove: "Send a short priority invite.",
      suggestedCardType: "open_slot_fill",
      confidence,
      evidence,
    };
  }

  return {
    opportunityId: opportunity.opportunityId,
    subjectName,
    insightTitle: "Relationship move detected",
    whatTaikosSees: "tAIkOS found a relationship opportunity from the book.",
    whyThisMatters: "The next move is to turn a data point into a personal action.",
    suggestedRelationshipMove: "Preview the suggested card.",
    suggestedCardType: "service_card",
    confidence,
    evidence,
  };
}
