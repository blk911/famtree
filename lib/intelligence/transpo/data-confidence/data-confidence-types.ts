// lib/intelligence/transpo/data-confidence/data-confidence-types.ts

export type TranspoDataSourceStatus =
  | "live"
  | "seeded"
  | "heuristic"
  | "missing"
  | "error";

export type TranspoConfidenceGrade =
  | "high"
  | "medium"
  | "low"
  | "experimental";

export type TranspoDataConfidenceRecord = {
  id: string;
  state: string;
  county?: string;
  city?: string;
  serviceCategory?: string;
  carrierSupplyStatus: TranspoDataSourceStatus;
  verificationStatus: TranspoDataSourceStatus;
  demandStatus: TranspoDataSourceStatus;
  payerStatus: TranspoDataSourceStatus;
  revenueStatus: TranspoDataSourceStatus;
  confidenceScore: number;
  confidenceGrade: TranspoConfidenceGrade;
  liveSignals: string[];
  seededSignals: string[];
  heuristicSignals: string[];
  missingSignals: string[];
  errors: string[];
  recommendedNextDataSource?: string;
  createdAt: string;
  updatedAt: string;
};

/** Embedded on service deficit rows — same fields minus id/timestamps. */
export type TranspoServiceDeficitDataConfidence = {
  confidenceScore: number;
  confidenceGrade: TranspoConfidenceGrade;
  carrierSupplyStatus: TranspoDataSourceStatus;
  verificationStatus: TranspoDataSourceStatus;
  demandStatus: TranspoDataSourceStatus;
  payerStatus: TranspoDataSourceStatus;
  revenueStatus: TranspoDataSourceStatus;
  liveSignals: string[];
  seededSignals: string[];
  heuristicSignals: string[];
  missingSignals: string[];
  recommendedNextDataSource?: string;
};

export type TranspoDataConfidenceSummary = {
  totalRecords: number;
  high: number;
  medium: number;
  low: number;
  experimental: number;
  liveCarrierSupply: number;
  liveVerification: number;
  livePayers: number;
  seededDemand: number;
  seededPayers: number;
  missingPayers: number;
  missingDemandOrPayer: number;
  averageConfidenceScore: number;
  topActionable: TranspoDataConfidenceRecord[];
  topWeak: TranspoDataConfidenceRecord[];
};

export type TranspoDataConfidenceQuestion = {
  id: string;
  question: string;
  answer: string;
};

export type TranspoLiveDataSetupStatus = {
  databaseUrlPresent: boolean;
  transpoFmcsaProvider: string;
  googleMapsApiKeyPresent: boolean;
  carrierMasterCount: number;
  verificationCount: number;
  demandSourceStatus: TranspoDataSourceStatus;
  payerSourceStatus: TranspoDataSourceStatus;
  storageBackend: string;
  storageDurable: boolean;
};
