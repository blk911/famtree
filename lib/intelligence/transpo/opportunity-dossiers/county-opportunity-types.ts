// lib/intelligence/transpo/opportunity-dossiers/county-opportunity-types.ts

import type {
  NetworkFormationFields,
  TranspoOpportunityType,
  TranspoTimeHorizon,
} from "../network-formation/network-formation-types";

export type { TranspoOpportunityType, TranspoTimeHorizon };

export type CountyOpportunityProviderRef = {
  providerId: string;
  companyName: string;
  phone?: string;
  website?: string;
  contactabilityScore: number;
};

export type CountyOpportunityPayerRef = {
  name: string;
  category: string;
  sourceStatus: string;
};

export type CountyOpportunityDossier = {
  id: string;
  county: string;
  state: string;
  serviceCategory: string;
  population?: number;
  seniors?: number;
  veterans?: number;
  medicaidPopulation?: number;
  rurality?: string;
  deficitScore: number;
  confidenceScore: number;
  payerPresenceScore: number;
  providerCount: number;
  providers: CountyOpportunityProviderRef[];
  payers: CountyOpportunityPayerRef[];
  serviceCategories: string[];
  recommendedPlay: string;
  actionabilityScore: number;
  actionabilityBand: "watch" | "investigate" | "priority" | "immediate";
  brokerName?: string;
  evidence: string[];
} & Partial<NetworkFormationFields>;

export type CountyOpportunityQuestion = {
  id: string;
  question: string;
  answer: string;
};

export type CountyOpportunitySummary = {
  totalDossiers: number;
  immediateOpportunities: number;
  priorityOpportunities: number;
  zeroProviderRows: number;
  topImmediate: CountyOpportunityDossier[];
  nextWeekPlays?: number;
  networkFormationPlays?: number;
  collegeNetworkPlays?: number;
};
