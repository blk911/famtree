export type SalonQueryMode = "opportunity" | "intelligence" | "client";

export type SalonIntelligenceIntent =
  | "monthly_clients"
  | "monthly_revenue"
  | "service_popularity"
  | "repeat_clients"
  | "client_count"
  | "service_search_period"
  | "revenue_period"
  | "inactive_period";

export type SalonQueryIntent =
  | "best_clients"
  | "top_spenders"
  | "frequent_clients"
  | "lapsed_clients"
  | "overdue_clients"
  | "pcn_candidates"
  | "first_20_pcn"
  | "first_50_pcn"
  | "referral_candidates"
  | "vip_candidates"
  | "birthday_candidates"
  | "open_slot_candidates"
  | "upgrade_candidates"
  | "service_search"
  | "client_search"
  | "client_lookup"
  | SalonIntelligenceIntent
  | "unknown";

export type SalonQueryTemplate = {
  id: string;
  category: string;
  label: string;
  example: string;
  intent: SalonQueryIntent;
  aliases: string[];
};

export type SalonQueryMatch = {
  queryMode: SalonQueryMode;
  intent: SalonQueryIntent;
  confidence: number;
  templateId?: string;
  category?: string;
  limit?: number;
  serviceKeyword?: string;
  clientNameHint?: string;
  revenueThreshold?: number;
  repeatVisitThreshold?: number;
  original: string;
};

export type SalonIntelligenceAnswer = {
  headline: string;
  summary: string;
  metrics?: { label: string; value: string }[];
  rows?: { name: string; detail?: string }[];
  followUpPrompt?: string;
};

export type SalonClientDossier = {
  clientName: string;
  visits: number;
  lastVisit?: string;
  services: string[];
  revenue: number;
  opportunitySignals: string[];
  suggestedNextMove: string;
};

export type SalonQaResult = {
  clientId?: string;
  clientName: string;
  reason: string;
  evidence: string[];
  score?: number;
  suggestedCardType?: string;
};

export type SalonQaPreviewCardAction = {
  kind: "preview_card";
  label: string;
  cardType: SalonQaSuggestedCard["cardType"];
  clientName: string;
  clientId?: string;
  reason?: string;
};

export type SalonQaFollowUpQueryAction = {
  kind: "follow_up_query";
  label: string;
  question: string;
};

export type SalonQaFilterOpportunitiesAction = {
  kind: "filter_opportunities";
  label: string;
  filterIntent: string;
};

export type SalonQaSuggestedAction =
  | SalonQaPreviewCardAction
  | SalonQaFollowUpQueryAction
  | SalonQaFilterOpportunitiesAction;

export type SalonQaSuggestedCard = {
  clientId?: string;
  clientName: string;
  cardType:
    | "pcn_invite"
    | "birthday_card"
    | "reactivation_card"
    | "service_card"
    | "thank_you_card"
    | "referral_card";
  reason: string;
  confidence?: number;
};

import type { SalonQaBoundary } from "./boundary-policy";

export type { SalonQaBoundary };

export type SalonQaAnswer = {
  question: string;
  queryMode: SalonQueryMode;
  intent: string;
  confidence: number;
  headline: string;
  answerText: string;
  results: SalonQaResult[];
  suggestedAction?: SalonQaSuggestedAction;
  suggestedCards: SalonQaSuggestedCard[];
  filterLabel?: string;
  followUpPrompt: string;
  intelligence?: SalonIntelligenceAnswer;
  clientDossier?: SalonClientDossier;
  boundary?: SalonQaBoundary;
  suggestedQuestions?: string[];
};

/** Active TAIKOS question filter driving Today relationship discoveries. */
export type TodayActiveQuestionResult = SalonQaAnswer;

/** Answer body before suggested card enrichment. */
export type SalonQaAnswerBody = Omit<SalonQaAnswer, "suggestedCards" | "filterLabel" | "queryMode">;

/** Words TAIKOS must never use in salon-facing answers. */
export const SALON_QA_FORBIDDEN_WORDS = [
  "database",
  "query",
  "segmentation",
  "detected record",
  "user cohort",
  "campaign automation",
  "marketing list",
] as const;
