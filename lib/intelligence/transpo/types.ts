// lib/intelligence/transpo/types.ts
// Durable contracts for the Transpo intelligence pipeline.
// These shapes are the source of truth for source runs, carrier evidence, and
// resolved carrier targets — defined before any live FMCSA/SAFER wiring so the
// persisted artifacts stay stable as real adapters are added.

export type TranspoSource =
  | "fmcsa"
  | "safer"
  | "website"
  | "linkedin"
  | "facebook"
  | "google_business";

export type TranspoSourceMode =
  | "mock_fmcsa_test"
  | "csv_import"
  | "live_api"
  | "manual"
  | "unknown";

export type TranspoSourceRunInput = {
  market?: string;
  state?: string;
  city?: string;
  keyword?: string;
  limit?: number;
  notes?: string;
};

export type TranspoCarrierSourceRecord = {
  companyName: string;
  dotNumber?: string;
  mcNumber?: string;
  city?: string;
  state?: string;
  address?: string;
  phone?: string;
  website?: string;
  fleetSize?: number;
  driverCount?: number;
  authorityStatus?: string;
  keywords?: string[];
  sourceUrl?: string;
  rawSource: string;
};

export type TranspoSourceRun = {
  id: string;
  vertical: "transpo";
  source: TranspoSource;
  sourceMode: TranspoSourceMode;
  input: TranspoSourceRunInput;
  recordCount: number;
  records: TranspoCarrierSourceRecord[];
  createdAt: string;
};

export type TranspoEvidence = {
  id: string;
  carrierKey: string;
  source: TranspoSource;
  evidenceType:
    | "identity"
    | "authority"
    | "fleet"
    | "hiring"
    | "website"
    | "social"
    | "contact"
    | "location"
    | "unknown";
  value: string;
  confidence: number;
  sourceUrl?: string;
  observedAt: string;
};

export type TranspoCarrierTarget = {
  id: string;
  companyName: string;
  dotNumber?: string;
  mcNumber?: string;
  city?: string;
  state?: string;
  phone?: string;
  website?: string;
  fleetSize?: number;
  driverCount?: number;
  authorityStatus?: string;
  sources: TranspoSource[];
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
};
