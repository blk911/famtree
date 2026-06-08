// lib/markets/paths.ts

import path from "path";

export const MARKETS_DATA_DIR = path.join(process.cwd(), "runtime-data", "markets");

export const MARKET_CANDIDATES_ARTIFACT_PATH = path.join(
  MARKETS_DATA_DIR,
  "market-candidates.generated.json",
);
