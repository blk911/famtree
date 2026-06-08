// lib/markets/read-market-candidates.ts

import { readFile } from "fs/promises";
import { MARKET_CANDIDATES_ARTIFACT_PATH } from "./paths";
import type { MarketCandidatesArtifact } from "./types";

export { MARKET_CANDIDATES_ARTIFACT_PATH };

export async function readMarketCandidatesArtifact(
  artifactPath: string = MARKET_CANDIDATES_ARTIFACT_PATH,
): Promise<MarketCandidatesArtifact | null> {
  try {
    const raw = await readFile(artifactPath, "utf8");
    return JSON.parse(raw) as MarketCandidatesArtifact;
  } catch {
    return null;
  }
}
