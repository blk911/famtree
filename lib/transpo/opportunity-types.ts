// lib/transpo/opportunity-types.ts
// Ranked county opportunity synthesis — demand anchors × capacity × evidence gaps.

export type TranspoOpportunityType =
  | "rural_anchor_bundle"
  | "provider_capacity_gap"
  | "wheelchair_gap"
  | "hospital_discharge_gap"
  | "dialysis_transport_gap"
  | "meal_route_gap"
  | "broker_transition_gap"
  | "research_priority"
  | "low_gap_monitor";

export type TranspoOpportunityConfidence = "low" | "medium" | "high";

export type TranspoOpportunityResearchPriority = "low" | "medium" | "high";

export interface TranspoOpportunityDemandAnchors {
  hospitals: string[];
  dialysis: string[];
  mealPrograms: string[];
  seniorCenters: string[];
  va: string[];
  behavioralHealth: string[];
}

export interface TranspoOpportunity {
  opportunityKey: string;
  countyKey: string;
  county: string;
  state: string;
  opportunityType: TranspoOpportunityType;
  title: string;
  summary: string;
  demandScore: number;
  capacityScore: number;
  opportunityScore: number;
  evidenceCompletenessScore: number;
  researchPriority: TranspoOpportunityResearchPriority;
  providerCount: number;
  demandAnchors: TranspoOpportunityDemandAnchors;
  topProviders: string[];
  missingCriticalEvidence: string[];
  confidence: TranspoOpportunityConfidence;
  actionabilityScore: number;
  nextAction: string;
  rationale: string[];
  sourceArtifacts: string[];
  generatedAt: string;
}

export interface TranspoOpportunitiesSummary {
  byType: Record<TranspoOpportunityType, number>;
  byConfidence: Record<TranspoOpportunityConfidence, number>;
  topHighConfidence: TranspoOpportunity[];
  topResearchPriority: TranspoOpportunity[];
}

export interface TranspoOpportunitiesArtifact {
  generatedAt: string;
  total: number;
  opportunities: TranspoOpportunity[];
  summary: TranspoOpportunitiesSummary;
}

export const TRANSPO_OPPORTUNITY_TYPE_LABELS: Record<TranspoOpportunityType, string> = {
  rural_anchor_bundle: "Rural anchor bundle",
  provider_capacity_gap: "Provider capacity gap",
  wheelchair_gap: "Wheelchair gap",
  hospital_discharge_gap: "Hospital discharge gap",
  dialysis_transport_gap: "Dialysis transport gap",
  meal_route_gap: "Meal route gap",
  broker_transition_gap: "Broker transition gap",
  research_priority: "Research priority",
  low_gap_monitor: "Low-gap monitor",
};

export const TRANSPO_OPPORTUNITY_NEXT_ACTIONS: Record<TranspoOpportunityType, string> = {
  provider_capacity_gap:
    "Validate active provider coverage and identify recruit/partner targets.",
  rural_anchor_bundle:
    "Confirm recurring anchor routes with hospital, dialysis, meals, and senior programs.",
  wheelchair_gap:
    "Verify wheelchair-capable fleet count and discharge transport availability.",
  hospital_discharge_gap:
    "Contact hospital case management/discharge planning for transport delay evidence.",
  dialysis_transport_gap:
    "Confirm dialysis patient transport reliability and missed-treatment transportation issues.",
  meal_route_gap:
    "Contact aging services or meal program for route volume and volunteer-driver constraints.",
  broker_transition_gap:
    "Track broker transition or recruitment signals and validate overflow routing impact.",
  research_priority:
    "Complete critical evidence tasks before ranking this as a service opportunity.",
  low_gap_monitor:
    "Monitor only unless complaints, broker overflow, or provider distress signals appear.",
};
