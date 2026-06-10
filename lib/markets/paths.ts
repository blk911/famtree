// lib/markets/paths.ts
// Vercel serverless mounts /var/task read-only; /tmp is the only writable dir.

import path from "path";

export function getMarketsDataDir(): string {
  if (process.env.VERCEL === "1") {
    return path.join("/tmp", "markets");
  }
  return path.join(process.cwd(), "runtime-data", "markets");
}

export const MARKETS_DATA_DIR = getMarketsDataDir();

export const MARKET_CANDIDATES_ARTIFACT_PATH = path.join(
  MARKETS_DATA_DIR,
  "market-candidates.generated.json",
);
