// scripts/build-sola-resolver-import.ts

import {
  buildSolaResolverImport,
  RESOLVER_IMPORT_ARTIFACT_PATH,
} from "@/lib/operators/sources/sola/build-resolver-import";

async function main(): Promise<void> {
  const artifact = await buildSolaResolverImport();

  console.log(`Total records: ${artifact.recordCount}`);
  console.log(`Live verified: ${artifact.summary.liveVerified}`);
  console.log(`Artifact: ${RESOLVER_IMPORT_ARTIFACT_PATH}`);
  console.log("");
  console.log("Top 10 acquisition candidates");
  for (const record of artifact.summary.topAcquisitionCandidates) {
    console.log(
      `  ${record.acquisitionScore.toString().padStart(3)}  ${record.displayName} (${record.slug}) — ${record.verificationStatus} / ${record.recommendedAction}`,
    );
  }
  console.log("");
  console.log("Category breakdown");
  for (const [category, count] of Object.entries(artifact.summary.byCategory).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${category.padEnd(8)} ${count}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
