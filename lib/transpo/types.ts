// lib/transpo/types.ts
// Normalized demand-generator registry types (Transpo intelligence layer).

export type DemandGeneratorCategory =
  | "hospital"
  | "dialysis"
  | "va"
  | "behavioral_health"
  | "adult_day"
  | "senior_center"
  | "meal_program"
  | "school_transition"
  | "pharmacy"
  | "other";

export interface DemandGenerator {
  generatorKey: string;
  category: DemandGeneratorCategory;
  facilityName: string;
  displayName: string;
  county: string;
  state: string;
  city?: string;
  address?: string;
  zip?: string;
  phone?: string;
  website?: string;
  beds?: number;
  stations?: number;
  annualDischarges?: number;
  annualVisits?: number;
  estimatedTripsPerWeek?: number;
  sourceProvider: string;
  sourceType: string;
  sourceUrl?: string;
  sourceUpdatedAt?: string;
  confidence: number;
  notes?: string[];
  createdAt: string;
  updatedAt: string;
}

export type GapLevel = "low" | "medium" | "high" | "severe";

export type ResearchPriority = "high" | "medium" | "low";

export interface CountyDemandDossier {
  countyKey: string;
  county: string;
  state: string;
  generatedAt: string;
  demandGenerators: DemandGenerator[];
  countsByCategory: Record<string, number>;
  demandScore: number;
  recurringDemandScore: number;
  ruralAnchorScore: number;
  providerCount?: number;
  providerNames?: string[];
  providerCapacityScore?: number;
  opportunityScore?: number;
  gapLevel?: GapLevel;
  evidenceCompletenessScore?: number;
  evidenceKnownCount?: number;
  evidenceInferredCount?: number;
  evidenceMissingCount?: number;
  researchPriority?: ResearchPriority;
  topAnchors: DemandGenerator[];
  missingData: string[];
}

export interface DemandGeneratorSourceEntry {
  count: number;
}

export interface DemandGeneratorsArtifact {
  generatedAt: string;
  total: number;
  sources: Record<string, DemandGeneratorSourceEntry>;
  generators: DemandGenerator[];
}

export interface CountyDemandDossiersArtifact {
  generatedAt: string;
  totalCounties: number;
  dossiers: CountyDemandDossier[];
}

export type RawDemandGeneratorInput = {
  category?: string;
  facilityName: string;
  displayName?: string;
  county: string;
  state: string;
  city?: string;
  address?: string;
  zip?: string;
  phone?: string;
  website?: string;
  beds?: number;
  stations?: number;
  annualDischarges?: number;
  annualVisits?: number;
  sourceProvider: string;
  sourceType: string;
  sourceUrl?: string;
  sourceUpdatedAt?: string;
  notes?: string[];
};

export interface DemandGeneratorsSeedFile {
  version?: number;
  records: RawDemandGeneratorInput[];
}
