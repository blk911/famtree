// lib/markets/build-market-candidates.ts

import { mkdir, writeFile } from "fs/promises";
import { adaptSolaToMarketCandidates, SOLA_SOURCE_KEY } from "./adapters/sola-to-market-candidates";
import { MARKET_CANDIDATES_ARTIFACT_PATH, MARKETS_DATA_DIR } from "./paths";
import type { MarketCandidatesArtifact, MarketCandidate } from "./types";

export type MarketCandidateAdapter = () => Promise<{
  sourceKey: string;
  artifactPath: string;
  lastImportedAt: string;
  candidates: MarketCandidate[];
} | null>;

const ADAPTERS: MarketCandidateAdapter[] = [adaptSolaToMarketCandidates];

function compareCandidates(a: MarketCandidate, b: MarketCandidate): number {
  if (b.acquisitionScore !== a.acquisitionScore) {
    return b.acquisitionScore - a.acquisitionScore;
  }
  if (b.contactabilityScore !== a.contactabilityScore) {
    return b.contactabilityScore - a.contactabilityScore;
  }
  return a.operatorName.localeCompare(b.operatorName, undefined, { sensitivity: "base" });
}

export async function buildMarketCandidatesRegistry(): Promise<MarketCandidatesArtifact> {
  const sources: MarketCandidatesArtifact["sources"] = {};
  const candidates: MarketCandidate[] = [];

  for (const adapt of ADAPTERS) {
    const result = await adapt();
    if (!result) continue;

    sources[result.sourceKey] = {
      count: result.candidates.length,
      artifactPath: result.artifactPath,
      lastImportedAt: result.lastImportedAt,
    };
    candidates.push(...result.candidates);
  }

  candidates.sort(compareCandidates);

  const artifact: MarketCandidatesArtifact = {
    generatedAt: new Date().toISOString(),
    total: candidates.length,
    sources,
    candidates,
  };

  await mkdir(MARKETS_DATA_DIR, { recursive: true });
  await writeFile(
    MARKET_CANDIDATES_ARTIFACT_PATH,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );

  return artifact;
}

export { SOLA_SOURCE_KEY };
