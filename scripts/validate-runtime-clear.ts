// scripts/validate-runtime-clear.ts

import { clearRuntimeArtifacts, dryRunIsolationCheck } from "@/lib/runtime/clear-runtime-artifacts";

async function main(): Promise<void> {
  const salon = await clearRuntimeArtifacts("salon", { dryRun: true });
  const transpo = await clearRuntimeArtifacts("transpo", { dryRun: true });
  const isolation = await dryRunIsolationCheck();

  console.log("Runtime clear dry-run validation");
  console.log(`Salon would delete: ${salon.deletedFiles.length}`);
  console.log(`Transpo would delete: ${transpo.deletedFiles.length}`);

  if (isolation.salonIncludesTranspo.length > 0) {
    throw new Error(
      `Salon dry run includes transpo files: ${isolation.salonIncludesTranspo.join(", ")}`,
    );
  }

  if (isolation.transpoIncludesSalonOrMarkets.length > 0) {
    throw new Error(
      `Transpo dry run includes salon/market files: ${isolation.transpoIncludesSalonOrMarkets.join(", ")}`,
    );
  }

  if (isolation.transpoPreservesSidecars.length > 0) {
    throw new Error(
      `Transpo dry run would delete preserved sidecars: ${isolation.transpoPreservesSidecars.join(", ")}`,
    );
  }

  const transpoPreserveHits = transpo.preservedFiles.filter(
    (f) =>
      f.endsWith("research-task-state.json") ||
      f.endsWith("evidence-overrides.json") ||
      f.endsWith(".seed.json"),
  );

  console.log(`Salon preserved (overlap in generated set): ${salon.preservedFiles.length}`);
  console.log(`Transpo preserved (overlap in generated set): ${transpo.preservedFiles.length}`);
  console.log(`Transpo sidecar/seed preserved matches: ${transpoPreserveHits.length}`);
  console.log("Transpo protected:", transpo.protectedFiles.join(", ") || "(none)");
  console.log("Salon protected:", salon.protectedFiles.join(", ") || "(none)");
  console.log("Isolation checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
