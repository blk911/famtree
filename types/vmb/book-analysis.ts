import type { VmbProviderPlatform } from "./trial";

export type VmbOpportunityType = "reactivation" | "referral" | "gift" | "trusted_intro";

export type VmbBookOpportunity = {
  id: string;
  clientName: string;
  opportunityType: VmbOpportunityType;
  summary: string;
  estimatedValue: number;
  confidence: "low" | "medium" | "high";
  suggestedAction: string;
};

export type VmbTrustedIntroOpportunity = {
  id: string;
  clientName: string;
  introCategory: "nails" | "hair" | "skin" | "wax" | "lashes" | "massage" | "other";
  promptText: string;
  status: "not_requested" | "requested" | "introduced" | "joined";
};

export type VmbBookAnalysisResult = {
  analysisId: string;
  trialId?: string;
  salonName?: string;
  providerPlatform?: VmbProviderPlatform;
  recordCount: number;
  reactivationTargets: VmbBookOpportunity[];
  referralOpportunities: VmbBookOpportunity[];
  giftOpportunities: VmbBookOpportunity[];
  trustedProviderIntroOpportunities: VmbTrustedIntroOpportunity[];
  estimatedRecoverableRevenue: number;
  generatedAt: string;
};

export type AnalyzeBookInput = {
  trialId?: string;
  salonName?: string;
  providerPlatform?: VmbProviderPlatform;
  records: import("./provider-ingest").VmbBookRecord[];
};
