// lib/studios/source-runs/types.ts

export type SalonSourceRunStatus = "complete" | "harvest_only" | "failed";

export interface SalonSourceRunNextLinks {
  markets: string;
  solaDetail: string;
  viewRun: string;
}

export interface SalonSourceRunRecord {
  runId: string;
  sourceProvider: string;
  slug: string;
  inputUrl: string;
  listingsFound: number;
  profilesEnriched: number;
  resolverCandidatesCreated: number;
  marketCandidatesCreated: number;
  status: SalonSourceRunStatus;
  harvestSucceeded: boolean;
  promotionSucceeded: boolean;
  createdAt: string;
  artifactPaths: Record<string, string>;
  nextLinks: SalonSourceRunNextLinks;
  errors: string[];
  warnings: string[];
}

export interface SalonSourceRunsArtifact {
  generatedAt: string;
  runs: SalonSourceRunRecord[];
}
