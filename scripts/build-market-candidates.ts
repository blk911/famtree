// scripts/build-market-candidates.ts

import { buildMarketCandidatesRegistry } from "@/lib/markets/build-market-candidates";
import { GGEN_SOURCE_KEY, SOLA_SOURCE_KEY } from "@/lib/markets/build-market-candidates";
import { MARKET_CANDIDATES_ARTIFACT_PATH } from "@/lib/markets/paths";

async function main(): Promise<void> {
  const { artifact, adapterResults } = await buildMarketCandidatesRegistry();

  const sola = adapterResults.find((r) => r.sourceKey === SOLA_SOURCE_KEY);
  const ggen = adapterResults.find((r) => r.sourceKey === GGEN_SOURCE_KEY);

  console.log(`Sola imported: ${sola?.importedCount ?? 0}`);
  console.log(`GG imported: ${ggen?.importedCount ?? 0}`);
  console.log(`Total candidates: ${artifact.total}`);
  console.log(`GG skipped: ${ggen?.skippedCount ?? 0}`);
  console.log(`GG artifact path: ${ggen?.artifactPath ?? "runtime-data/studios/ggen-seed-discovery"}`);
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
