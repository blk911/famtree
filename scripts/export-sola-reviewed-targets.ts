// scripts/export-sola-reviewed-targets.ts

import {
  exportSolaReviewedTargets,
  SOLA_REVIEWED_TARGETS_CSV_PATH,
  SOLA_REVIEWED_TARGETS_JSON_PATH,
} from "@/lib/operators/sources/sola/export-reviewed-targets";

async function main(): Promise<void> {
  const artifact = await exportSolaReviewedTargets();

  console.log(`Exported ${artifact.exportedCount} reviewed targets`);
  console.log(`JSON: ${SOLA_REVIEWED_TARGETS_JSON_PATH}`);
  console.log(`CSV:  ${SOLA_REVIEWED_TARGETS_CSV_PATH}`);

  if (artifact.exportedCount > 0) {
    console.log("");
    console.log("Top 5 by rank");
    for (const target of artifact.targets.slice(0, 5)) {
      console.log(
        `  ${target.rank}. [${target.reviewStatus}] ${target.displayName} (${target.locationSlug}) — acquire ${target.acquisitionScore}`,
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
