// lib/intelligence/transpo/network-formation/network-formation-types.ts

export type TranspoOpportunityType =
  | "network_formation"
  | "workforce_pipeline"
  | "provider_partnership"
  | "fleet_expansion"
  | "provider_acquisition"
  | "new_market_launch"
  | "dispatch_support"
  | "data_validation";

export type TranspoTimeHorizon = "next_week" | "30_days" | "90_days" | "strategic";

export type NetworkFormationFields = {
  opportunityType: TranspoOpportunityType;
  nearTermPlay?: string;
  firstMove?: string;
  localNetworkTargets?: string[];
  nextWeekActions?: string[];
  expectedOutcome?: string;
  timeHorizon?: TranspoTimeHorizon;
};

export const OPPORTUNITY_TYPE_LABELS: Record<TranspoOpportunityType, string> = {
  network_formation: "Network Formation",
  workforce_pipeline: "Workforce Pipeline",
  provider_partnership: "Provider Partnership",
  fleet_expansion: "Fleet Expansion",
  provider_acquisition: "Provider Acquisition",
  new_market_launch: "New Market Launch",
  dispatch_support: "Dispatch Support",
  data_validation: "Data Validation",
};

export const TIME_HORIZON_LABELS: Record<TranspoTimeHorizon, string> = {
  next_week: "Next Week",
  "30_days": "30 Days",
  "90_days": "90 Days",
  strategic: "Strategic",
};

export type NetworkFormationQuestion = {
  id: string;
  question: string;
  answer: string;
};
