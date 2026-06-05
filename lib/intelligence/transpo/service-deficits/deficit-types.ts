// lib/intelligence/transpo/service-deficits/deficit-types.ts

import type { TranspoServiceDeficitDataConfidence } from "../data-confidence/data-confidence-types";
import type { TranspoServiceCategory, TranspoGapSeverity } from "../market-gaps/types";
import type { TranspoCountyDemandRecord } from "../demand/demand-types";

export type TranspoRevenuePotential = "low" | "medium" | "high" | "strategic";

export type TranspoRevenueOpportunity = {
  estimatedPopulationAffected: number;
  estimatedServiceDemand: number;
  opportunityScore: number;
  revenuePotential: TranspoRevenuePotential;
  recommendedPlay: string;
};

export type TranspoServiceDeficitRecord = {
  id: string;
  state: string;
  county: string;
  countyFips?: string;
  marketLabel: string;
  serviceCategory: TranspoServiceCategory;
  needScore: number;
  payerPresenceScore: number;
  coverageScore: number;
  deficitScore: number;
  severity: TranspoGapSeverity;
  demand: TranspoCountyDemandRecord;
  providerCount: number;
  verifiedProviderCount: number;
  fleetCapacity: number;
  reasons: string[];
  evidence: string[];
  revenueOpportunity: TranspoRevenueOpportunity;
  dataConfidence?: TranspoServiceDeficitDataConfidence;
  createdAt: string;
  updatedAt: string;
};

export type TranspoServiceDeficitSummary = {
  totalDeficits: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  averageDeficitScore: number;
  topDeficits: TranspoServiceDeficitRecord[];
  topRevenueOpportunities: TranspoServiceDeficitRecord[];
  byServiceCategory: {
    serviceCategory: TranspoServiceCategory;
    total: number;
    critical: number;
    high: number;
    averageDeficitScore: number;
  }[];
};

export type TranspoServiceDeficitQuestion = {
  id: string;
  question: string;
  answer: string;
};
