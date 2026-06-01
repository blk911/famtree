// lib/intelligence/salon/ggen-seed-discovery/types.ts

export type GgenDiscoverySource = "seed_search" | "candidate_probe";

export type GgenSeedInput = {
  businessName: string;
  category?: string | null;
  city?: string | null;
  state?: string | null;
  lineNumber: number;
};

export type GgenSeedDiscoveryResult = {
  id: string;
  businessName: string;
  normalizedName: string;
  category: string | null;
  city: string | null;
  state: string | null;
  found: boolean;
  bookingProvider: "glossgenius" | null;
  bookingUrl: string | null;
  confidence: number;
  discoverySource: GgenDiscoverySource | null;
  evidence: string[];
  searchQueries: string[];
  candidatesChecked: string[];
  importCandidate: boolean;
  matchedProspectIds: string[];
  matchedProspectHandles: string[];
  error?: string;
};

export type GgenDiscoveryRun = {
  runId: string;
  createdAt: string;
  marketCity: string | null;
  marketState: string | null;
  defaultCategory: string | null;
  seedCount: number;
  foundCount: number;
  importCandidateCount: number;
  results: GgenSeedDiscoveryResult[];
};

export type GgenDiscoveryRunSummary = {
  runId: string;
  createdAt: string;
  seedCount: number;
  foundCount: number;
};
