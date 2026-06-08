// scripts/build-market-candidates.ts

import { buildMarketCandidatesRegistry } from "@/lib/markets/build-market-candidates";
import { MARKET_CANDIDATES_ARTIFACT_PATH } from "@/lib/markets/paths";

async function main(): Promise<void> {
  const artifact = await buildMarketCandidatesRegistry();

  console.log(`Built ${artifact.total} market candidates`);
  console.log(`Artifact: ${MARKET_CANDIDATES_ARTIFACT_PATH}`);
  console.log("");
  console.log("Source counts");
  for (const [source, meta] of Object.entries(artifact.sources)) {
    console.log(`  ${source}: ${meta.count} (${meta.artifactPath})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
