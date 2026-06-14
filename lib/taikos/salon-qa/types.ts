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
  intent: SalonQueryIntent;
  confidence: number;
  templateId?: string;
  category?: string;
  limit?: number;
  serviceKeyword?: string;
  clientNameHint?: string;
  original: string;
};

export type SalonQaResult = {
  clientId?: string;
  clientName: string;
  reason: string;
  evidence: string[];
  score?: number;
  suggestedCardType?: string;
};

export type SalonQaSuggestedAction = {
  label: string;
  actionType:
    | "preview_pcn_invite"
    | "preview_refresh_card"
    | "preview_reactivation_card"
    | "preview_birthday_card"
    | "preview_referral_invite"
    | "show_clients";
  clientName?: string;
};

export type SalonQaAnswer = {
  question: string;
  intent: string;
  confidence: number;
  headline: string;
  answerText: string;
  results: SalonQaResult[];
  suggestedAction?: SalonQaSuggestedAction;
  followUpPrompt: string;
};

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
