// lib/intelligence/transpo/payers/colorado/colorado-payer-types.ts

export type ColoradoRegistrySourceStatus = "live" | "seeded";

export type ColoradoNemtBrokerRecord = {
  id: string;
  state: "CO";
  region?: string;
  county?: string;
  brokerName: string;
  website?: string;
  phone?: string;
  serviceCategories: string[];
  sourceUrl?: string;
  evidence: string[];
  sourceStatus: ColoradoRegistrySourceStatus;
};

export type ColoradoApprovedProviderRecord = {
  id: string;
  state: "CO";
  county?: string;
  city?: string;
  providerName: string;
  serviceCategories: string[];
  website?: string;
  phone?: string;
  sourceUrl?: string;
  evidence: string[];
  sourceStatus: ColoradoRegistrySourceStatus;
};

export type ColoradoMarketPayerMeta = {
  brokerName?: string;
  payerEvidence: string[];
  payerStatus: ColoradoRegistrySourceStatus | "missing";
  approvedProviderCount: number;
  payerPresenceBoost: number;
};

export type ColoradoCountyCoverageSummary = {
  scopeNote: string;
  countiesRepresented: string[];
  countiesWithPayerData: string[];
  countiesWithApprovedProviders: string[];
  countiesMissingPayerData: string[];
  totalInScope: number;
  coloradoCountyTotal: number;
  baselineMode?: boolean;
  countyServiceRows?: number;
  baselineRows?: number;
  observedRows?: number;
  zeroProviderRows?: number;
  criticalZeroProviderRows?: number;
};
