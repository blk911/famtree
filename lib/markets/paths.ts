// lib/markets/paths.ts
// Vercel serverless mounts /var/task read-only; /tmp is the only writable dir.

import path from "path";

export const MARKETS_DATA_DIR =
  process.env.VERCEL === "1"
    ? path.join("/tmp", "markets")
    : path.join(process.cwd(), "runtime-data", "markets");

export const MARKET_CANDIDATES_ARTIFACT_PATH = path.join(
  MARKETS_DATA_DIR,
  "market-candidates.generated.json",
);
