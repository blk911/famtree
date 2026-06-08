// lib/transpo/provider-types.ts

export interface ProviderCapacity {
  providerKey: string;
  providerName: string;
  phone?: string;
  website?: string;
  activeMedicaidProvider: boolean;
  countiesServed: string[];
  countyCount: number;
  sourceProvider: string;
  sourceUrl?: string;
  footprintScore: number;
  confidence: number;
  notes?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CountyCapacity {
  countyKey: string;
  county: string;
  state: string;
  providerCount: number;
  activeProviders: number;
  regionalProviders: number;
  statewideProviders: number;
  providers: string[];
  capacityScore: number;
  generatedAt: string;
}

export interface ProviderCapacityArtifact {
  generatedAt: string;
  totalProviders: number;
  providers: ProviderCapacity[];
}

export interface CountyCapacityArtifact {
  generatedAt: string;
  totalCounties: number;
  counties: CountyCapacity[];
}

import type { GapLevel } from "./types";

export type { GapLevel };

export interface CountyGapAnalysis {
  countyKey: string;
  county: string;
  state: string;
  demandScore: number;
  capacityScore: number;
  opportunityScore: number;
  providerCount: number;
  topDemandAnchors: string[];
  topProviders: string[];
  gapLevel: GapLevel;
  generatedAt: string;
}

export interface CountyGapAnalysisArtifact {
  generatedAt: string;
  totalCounties: number;
  counties: CountyGapAnalysis[];
}

export type RawProviderCountyAssignment = {
  county: string;
  providerName: string;
  phone?: string;
  state?: string;
};

export interface ProviderCapacitySeedFile {
  version?: number;
  sourceUrl?: string;
  sourceProvider?: string;
  records: RawProviderCountyAssignment[];
}
