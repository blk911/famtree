// scripts/build-transpo-data-ownership.ts

import { buildColoradoDataOwnership } from "@/lib/transpo/build-colorado-data-ownership";

async function main(): Promise<void> {
  const { registry, workflow, accessPaths, highValueTargets } =
    await buildColoradoDataOwnership();

  console.log("Transpo data ownership registry build complete");
  console.log(`Ownership records: ${registry.total}`);
  console.log(`Known systems: ${registry.summary.knownSystems.length}`);
  console.log(`Public sources: ${registry.summary.publicSources}`);
  console.log(`Workflow steps: ${workflow.steps.length}`);
  console.log(`Access paths: ${accessPaths.total}`);
  console.log(`High-value targets: ${highValueTargets.total}`);
  console.log("");
  console.log("Closest path to unfilled ride data:");
  for (const item of highValueTargets.closestPathToUnfilledRideData) {
    console.log(`  ${item.rank}. ${item.entityName}`);
    console.log(`     ${item.rationale}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
