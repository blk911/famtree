import type { TaikosActionType } from "@/lib/taikos/types";

export type TaikosOpportunityCategory =
  | "Birthday"
  | "Referral"
  | "Reactivation"
  | "Open Slot"
  | "PCN Invite"
  | "Campaign"
  | "Revenue Gap"
  | "Retention";

export type TaikosOpportunityPriority = "High" | "Medium" | "Low";

export type TaikosOpportunity = {
  opportunityId: string;
  title: string;
  category: TaikosOpportunityCategory;
  estimatedValue: number;
  confidence: number;
  recommendation: string;
  suggestedAction: TaikosActionType;
  linkedGoalId?: string;
  priority: TaikosOpportunityPriority;
  score: number;
};

export type TaikosOpportunitySummary = {
  totalOpportunities: number;
  highPriority: number;
  topOpportunity: TaikosOpportunity | null;
  opportunities: TaikosOpportunity[];
};
