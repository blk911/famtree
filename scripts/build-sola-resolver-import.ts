// scripts/build-sola-resolver-import.ts

import {
  buildSolaResolverImport,
  RESOLVER_IMPORT_ARTIFACT_PATH,
} from "@/lib/operators/sources/sola/build-resolver-import";

async function main(): Promise<void> {
  const artifact = await buildSolaResolverImport();

  console.log(`Wrote ${artifact.recordCount} records → ${RESOLVER_IMPORT_ARTIFACT_PATH}`);
  console.log("");
  console.log("Summary");
  console.log(`  total:              ${artifact.summary.total}`);
  console.log(`  liveVerified:       ${artifact.summary.liveVerified}`);
  console.log(`  matched:            ${artifact.summary.matched}`);
  console.log(`  discovered:         ${artifact.summary.discovered}`);
  console.log(`  avgContactability:  ${artifact.summary.avgContactability}`);
  console.log(`  avgIdentity:        ${artifact.summary.avgIdentity}`);
  console.log(`  avgAcquisition:     ${artifact.summary.avgAcquisition}`);
  console.log("");
  console.log("By category");
  for (const [category, count] of Object.entries(artifact.summary.byCategory).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${category.padEnd(8)} ${count}`);
  }
  console.log("");
  console.log("Top 10 acquisition candidates");
  for (const record of artifact.records.slice(0, 10)) {
    console.log(
      `  ${record.acquisitionScore.toString().padStart(3)}  ${record.displayName} (${record.parentContainerSlug}) — ${record.status} / ${record.recommendedAction}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
