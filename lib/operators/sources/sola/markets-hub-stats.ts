// lib/operators/sources/sola/markets-hub-stats.ts

import { readSolaResolverImport } from "./read-sola-resolver-import";
import { readSolaReviewStates } from "./sola-review-state-store";

export interface SolaMarketsHubStats {
  available: boolean;
  total: number;
  liveVerified: number;
  avgAcquisition: number;
  reviewedCount: number;
}

export async function loadSolaMarketsHubStats(): Promise<SolaMarketsHubStats> {
  const [artifact, reviewStates] = await Promise.all([
    readSolaResolverImport(),
    readSolaReviewStates(),
  ]);

  if (!artifact) {
    return {
      available: false,
      total: 0,
      liveVerified: 0,
      avgAcquisition: 0,
      reviewedCount: 0,
    };
  }

  return {
    available: true,
    total: artifact.summary.total,
    liveVerified: artifact.summary.liveVerified,
    avgAcquisition: artifact.summary.avgAcquisition,
    reviewedCount: Object.keys(reviewStates).length,
  };
}
