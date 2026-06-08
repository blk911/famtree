// lib/transpo/build-county-gap-analysis.ts

import { mkdir, writeFile } from "fs/promises";
import { COUNTY_GAP_ANALYSIS_ARTIFACT_PATH, TRANSPO_DATA_DIR } from "./paths";
import type { CountyCapacity, CountyGapAnalysis, CountyGapAnalysisArtifact } from "./provider-types";
import type { CountyDemandDossier, GapLevel } from "./types";

export function calculateOpportunityScore(
  dossier: CountyDemandDossier,
  capacityScore: number,
  providerCount: number,
): number {
  let score = dossier.demandScore - capacityScore;

  if (providerCount <= 2) score += 15;
  if ((dossier.countsByCategory.dialysis ?? 0) > 0) score += 10;
  if ((dossier.countsByCategory.hospital ?? 0) > 0) score += 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function gapLevelFromOpportunityScore(opportunityScore: number): GapLevel {
  if (opportunityScore >= 80) return "severe";
  if (opportunityScore >= 60) return "high";
  if (opportunityScore >= 40) return "medium";
  return "low";
}

export function buildCountyGapAnalyses(
  dossiers: CountyDemandDossier[],
  capacityByCountyKey: Map<string, CountyCapacity>,
  generatedAt = new Date().toISOString(),
): CountyGapAnalysis[] {
  return dossiers.map((dossier) => {
    const capacity = capacityByCountyKey.get(dossier.countyKey);
    const capacityScore = capacity?.capacityScore ?? 0;
    const providerCount = capacity?.providerCount ?? 0;
    const opportunityScore = calculateOpportunityScore(dossier, capacityScore, providerCount);

    return {
      countyKey: dossier.countyKey,
      county: dossier.county,
      state: dossier.state,
      demandScore: dossier.demandScore,
      capacityScore,
      opportunityScore,
      providerCount,
      topDemandAnchors: dossier.topAnchors.map((a) => a.displayName),
      topProviders: (capacity?.providers ?? []).slice(0, 5),
      gapLevel: gapLevelFromOpportunityScore(opportunityScore),
      generatedAt,
    };
  });
}

export async function buildAndPersistCountyGapAnalysis(
  dossiers: CountyDemandDossier[],
  capacityByCountyKey: Map<string, CountyCapacity>,
): Promise<CountyGapAnalysisArtifact> {
  const generatedAt = new Date().toISOString();
  const counties = buildCountyGapAnalyses(dossiers, capacityByCountyKey, generatedAt);

  const artifact: CountyGapAnalysisArtifact = {
    generatedAt,
    totalCounties: counties.length,
    counties,
  };

  await mkdir(TRANSPO_DATA_DIR, { recursive: true });
  await writeFile(COUNTY_GAP_ANALYSIS_ARTIFACT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  return artifact;
}
