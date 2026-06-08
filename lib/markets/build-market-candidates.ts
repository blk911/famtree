// lib/markets/build-market-candidates.ts

import { mkdir, writeFile } from "fs/promises";
import { adaptGgenToMarketCandidates, GGEN_SOURCE_KEY } from "./adapters/ggen-to-market-candidates";
import { adaptSolaToMarketCandidates, SOLA_SOURCE_KEY } from "./adapters/sola-to-market-candidates";
import { MARKET_CANDIDATES_ARTIFACT_PATH, MARKETS_DATA_DIR } from "./paths";
import type { MarketCandidatesArtifact, MarketCandidate } from "./types";

export type MarketCandidateAdapterResult = {
  sourceKey: string;
  artifactPath: string;
  lastImportedAt: string;
  candidates: MarketCandidate[];
  importedCount: number;
  skippedCount: number;
};

export type MarketCandidateAdapter = () => Promise<MarketCandidateAdapterResult | null>;

const ADAPTERS: MarketCandidateAdapter[] = [
  adaptSolaToMarketCandidates,
  adaptGgenToMarketCandidates,
];

function compareCandidates(a: MarketCandidate, b: MarketCandidate): number {
  if (b.acquisitionScore !== a.acquisitionScore) {
    return b.acquisitionScore - a.acquisitionScore;
  }
  if (b.contactabilityScore !== a.contactabilityScore) {
    return b.contactabilityScore - a.contactabilityScore;
  }
  return a.operatorName.localeCompare(b.operatorName, undefined, { sensitivity: "base" });
}

export type BuildMarketCandidatesResult = {
  artifact: MarketCandidatesArtifact;
  adapterResults: MarketCandidateAdapterResult[];
};

export async function buildMarketCandidatesRegistry(): Promise<BuildMarketCandidatesResult> {
  const sources: MarketCandidatesArtifact["sources"] = {};
  const candidates: MarketCandidate[] = [];
  const adapterResults: MarketCandidateAdapterResult[] = [];

  for (const adapt of ADAPTERS) {
    const result = await adapt();
    if (!result) continue;

    adapterResults.push(result);
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

  return { artifact, adapterResults };
}

export { SOLA_SOURCE_KEY, GGEN_SOURCE_KEY };
