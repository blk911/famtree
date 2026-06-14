import type { TaikosOpportunity, TaikosOpportunityCategory } from "@/lib/taikos/opportunities/types";
import type { TaikosActionType } from "@/lib/taikos/types";
import type { OpportunityIntelligence } from "@/lib/vmb/opportunities/opportunity-intelligence";
import type { VmbCardType } from "@/lib/vmb/cards/card-types";
import type { SalonQaSuggestedCard } from "./types";

function categoryFromCardType(cardType: SalonQaSuggestedCard["cardType"]): TaikosOpportunityCategory {
  switch (cardType) {
    case "pcn_invite":
      return "PCN Invite";
    case "birthday_card":
      return "Birthday";
    case "reactivation_card":
      return "Reactivation";
    case "referral_card":
      return "Referral";
    case "thank_you_card":
      return "Retention";
    case "service_card":
      return "Retention";
    default:
      return "Retention";
  }
}

function actionFromCardType(cardType: SalonQaSuggestedCard["cardType"]): TaikosActionType {
  switch (cardType) {
    case "pcn_invite":
      return "CONTINUE_PCN_INVITES";
    case "birthday_card":
      return "CREATE_CAMPAIGN_DRAFT";
    case "reactivation_card":
      return "PREVIEW_REACTIVATION_MESSAGE";
    case "referral_card":
      return "PREVIEW_REFERRAL_ASK";
    case "thank_you_card":
    case "service_card":
      return "CREATE_SERVICE_CARD_DRAFT";
    default:
      return "CREATE_INVITE_DRAFT";
  }
}

export function vmbCardTypeFromSuggested(cardType: SalonQaSuggestedCard["cardType"]): VmbCardType {
  switch (cardType) {
    case "thank_you_card":
      return "vip_thank_you";
    case "referral_card":
      return "referral_invite";
    case "reactivation_card":
      return "reactivation_card";
    default:
      return cardType;
  }
}

export function questionCardToOpportunity(card: SalonQaSuggestedCard, index: number): TaikosOpportunity {
  const category = categoryFromCardType(card.cardType);
  const confidence = Math.round((card.confidence ?? 0.78) * 100);
  return {
    opportunityId: `qa-${card.clientId ?? card.clientName.replace(/\s+/g, "-").toLowerCase()}-${index}`,
    title: `${card.clientName} — ${category}`,
    category,
    estimatedValue: 120 + index * 5,
    confidence,
    recommendation: `${card.clientName} is a strong fit — ${card.reason}.`,
    suggestedAction: actionFromCardType(card.cardType),
    priority: index === 0 ? "High" : index < 3 ? "Medium" : "Low",
    score: 200 - index,
  };
}

export function questionCardToIntelligence(
  card: SalonQaSuggestedCard,
  opportunity: TaikosOpportunity,
): OpportunityIntelligence {
  const subject = card.clientName;
  const cardType = vmbCardTypeFromSuggested(card.cardType);
  const base = {
    opportunityId: opportunity.opportunityId,
    subjectName: subject,
    confidence: opportunity.confidence,
    evidence: [card.reason],
  };

  switch (card.cardType) {
    case "pcn_invite":
      return {
        ...base,
        insightTitle: "Private client invite",
        whatTaikosSees: `${subject} looks ready for a personal PCN invitation.`,
        whyThisMatters: "The right invite can deepen loyalty before they drift.",
        suggestedRelationshipMove: "Preview a Private Client Invite.",
        suggestedCardType: cardType,
      };
    case "birthday_card":
      return {
        ...base,
        insightTitle: "Birthday moment",
        whatTaikosSees: `${subject} has a birthday opportunity in your book.`,
        whyThisMatters: "Celebration notes feel personal and timely.",
        suggestedRelationshipMove: "Send a birthday card.",
        suggestedCardType: cardType,
      };
    case "reactivation_card":
      return {
        ...base,
        insightTitle: "Reactivation opportunity",
        whatTaikosSees: `${subject} has history with you but has not been in recently.`,
        whyThisMatters: "Past clients are often the fastest rebooking wins.",
        suggestedRelationshipMove: "Send a warm reconnection note.",
        suggestedCardType: cardType,
      };
    case "referral_card":
      return {
        ...base,
        insightTitle: "Referral relationship",
        whatTaikosSees: `${subject} shows referral or influence signals.`,
        whyThisMatters: "Some clients naturally bring trusted friends.",
        suggestedRelationshipMove: "Ask for a trusted intro.",
        suggestedCardType: cardType,
      };
    case "thank_you_card":
      return {
        ...base,
        insightTitle: "VIP appreciation",
        whatTaikosSees: `${subject} is a high-value relationship in your book.`,
        whyThisMatters: "A sincere thank-you keeps top clients close.",
        suggestedRelationshipMove: "Send a VIP thank-you note.",
        suggestedCardType: cardType,
      };
    case "service_card":
    default:
      return {
        ...base,
        insightTitle: "Service opportunity",
        whatTaikosSees: `${subject} connects to the service pattern you asked about.`,
        whyThisMatters: "Repeat service clients are easier to rebook.",
        suggestedRelationshipMove: "Preview a service refresh invite.",
        suggestedCardType: cardType,
      };
  }
}

export function questionCardsToOpportunitySummary(cards: SalonQaSuggestedCard[]): {
  totalOpportunities: number;
  highPriority: number;
  topOpportunity: TaikosOpportunity | null;
  opportunities: TaikosOpportunity[];
} {
  const opportunities = cards.map((card, index) => questionCardToOpportunity(card, index));
  return {
    totalOpportunities: opportunities.length,
    highPriority: opportunities.filter((o) => o.priority === "High").length,
    topOpportunity: opportunities[0] ?? null,
    opportunities,
  };
}
