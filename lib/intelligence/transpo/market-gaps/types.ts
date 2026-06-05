// lib/intelligence/transpo/market-gaps/types.ts

export type TranspoServiceCategory =
  | "nemt"
  | "medical_transport"
  | "senior_transport"
  | "veteran_transport"
  | "meal_delivery"
  | "rural_transit"
  | "general_carrier";

export type TranspoRurality = "urban" | "suburban" | "rural" | "frontier" | "unknown";

export type TranspoGapSeverity = "low" | "medium" | "high" | "critical";

export type TranspoMarketGapDemandSignals = {
  population?: number;
  rurality?: TranspoRurality;
  seniorShare?: number;
  medicaidShare?: number;
  veteransShare?: number;
  healthcareAccessScore?: number;
  foodAccessScore?: number;
};

export type TranspoMarketGapRecord = {
  id: string;
  state: string;
  county?: string;
  city?: string;
  marketLabel: string;
  serviceCategory: TranspoServiceCategory;
  carrierCount: number;
  activeAuthorityCount: number;
  verifiedCarrierCount: number;
  fleetCount?: number;
  driverCount?: number;
  demandSignals: TranspoMarketGapDemandSignals;
  supplyScore: number;
  demandScore: number;
  gapScore: number;
  severity: TranspoGapSeverity;
  reasons: string[];
  recommendedPlay: string;
  evidence: string[];
  createdAt: string;
  updatedAt: string;
};

export type TranspoMarketGapCategorySummary = {
  serviceCategory: TranspoServiceCategory;
  totalMarkets: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  averageGapScore: number;
};

export type TranspoMarketGapSummary = {
  totalMarkets: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  averageGapScore: number;
  byServiceCategory: TranspoMarketGapCategorySummary[];
  topGaps: TranspoMarketGapRecord[];
};

export type TranspoMarketGapQuestion = {
  id: string;
  question: string;
  answer: string;
};

export const TRANSPO_SERVICE_CATEGORIES: TranspoServiceCategory[] = [
  "nemt",
  "medical_transport",
  "senior_transport",
  "veteran_transport",
  "meal_delivery",
  "rural_transit",
  "general_carrier",
];

export const SERVICE_CATEGORY_LABELS: Record<TranspoServiceCategory, string> = {
  nemt: "NEMT",
  medical_transport: "Medical Transport",
  senior_transport: "Senior Transport",
  veteran_transport: "Veteran Transport",
  meal_delivery: "Meal Delivery",
  rural_transit: "Rural Transit",
  general_carrier: "General Carrier",
};
