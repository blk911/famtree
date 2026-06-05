// lib/intelligence/transpo/provider-dossiers/dossier-types.ts

export type TranspoDossierEvidence = {
  type: string;
  source: string;
  value: string;
  sourceUrl?: string;
};

export type TranspoProviderDossier = {
  providerId: string;
  companyName: string;
  dotNumber?: string;
  mcNumber?: string;
  address?: string;
  city?: string;
  county?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  website?: string;
  googlePlaceId?: string;
  googleRating?: number;
  googleReviewCount?: number;
  authorityStatus?: string;
  fleetSize?: number;
  driverCount?: number;
  serviceCategories: string[];
  countiesServed: string[];
  payerSignals: string[];
  verificationStatus: string;
  verificationScore?: number;
  yearsObserved?: number;
  sourceCount: number;
  contactabilityScore: number;
  contactabilityBand: "weak" | "fair" | "good" | "strong";
  evidence: TranspoDossierEvidence[];
  createdAt: string;
  updatedAt: string;
};

export type TranspoProviderDossierSummary = {
  totalProviders: number;
  verifiedProviders: number;
  strongContactability: number;
  weakContactability: number;
  averageContactability: number;
  averageFleetSize: number;
};
