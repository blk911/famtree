import type { VmbProviderPlatform } from "./trial";

export type VmbSalonWorkspace = {
  trialId: string;
  salonName: string;
  ownerName?: string;
  email?: string;
  providerPlatform?: VmbProviderPlatform;
  firstIngestCompleted: boolean;
  latestAnalysisId?: string;
  analysisIds: string[];
  lastIngestAt?: string;
  nextRefreshDueAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type UpsertWorkspaceInput = {
  trialId: string;
  salonName: string;
  ownerName?: string;
  email?: string;
  providerPlatform?: VmbProviderPlatform;
};
