// scripts/build-transpo-registry.ts
// Full Transpo intelligence build: demand → provider capacity → dossiers → gap analysis.

import { buildCountyCapacityDossiers } from "@/lib/transpo/build-county-capacity-dossiers";
import { buildCountyDemandDossiers } from "@/lib/transpo/build-county-demand-dossiers";
import { buildDemandGeneratorRegistry } from "@/lib/transpo/build-demand-generator-registry";
import { buildProviderCapacityRegistry } from "@/lib/transpo/build-provider-capacity-registry";
import { readCountyGapAnalysisArtifact } from "@/lib/transpo/read-provider-registry";

async function main(): Promise<void> {
  const demandRegistry = await buildDemandGeneratorRegistry();
  const providerRegistry = await buildProviderCapacityRegistry();
  const countyCapacity = await buildCountyCapacityDossiers();
  const demandDossiers = await buildCountyDemandDossiers();
  const gap = await readCountyGapAnalysisArtifact();

  const regional = providerRegistry.providers.filter(
    (p) => p.countyCount > 3 && p.countyCount <= 15,
  ).length;
  const statewide = providerRegistry.providers.filter((p) => p.countyCount > 15).length;

  console.log("Transpo registry build complete");
  console.log(`Demand generators: ${demandRegistry.total}`);
  console.log(`Providers: ${providerRegistry.totalProviders}`);
  console.log(`Counties (capacity): ${countyCapacity.totalCounties}`);
  console.log(`Demand dossiers: ${demandDossiers.totalCounties}`);
  console.log(`Regional providers: ${regional}`);
  console.log(`Statewide providers: ${statewide}`);

  const alamosaDossier = demandDossiers.dossiers.find(
    (d) => d.county === "Alamosa" && d.state === "CO",
  );
  const alamosaCapacity = countyCapacity.counties.find(
    (c) => c.county === "Alamosa" && c.state === "CO",
  );
  const alamosaGap = gap?.counties.find((c) => c.county === "Alamosa" && c.state === "CO");

  if (alamosaCapacity || alamosaDossier) {
    console.log("");
    console.log("Alamosa");
    console.log(`  Provider Count: ${alamosaCapacity?.providerCount ?? alamosaDossier?.providerCount ?? 0}`);
    console.log(`  Capacity Score: ${alamosaCapacity?.capacityScore ?? alamosaDossier?.providerCapacityScore ?? 0}`);
    console.log(`  Demand Score: ${alamosaDossier?.demandScore ?? 0}`);
    console.log(`  Opportunity Score: ${alamosaDossier?.opportunityScore ?? alamosaGap?.opportunityScore ?? 0}`);
    console.log(`  Gap Level: ${alamosaDossier?.gapLevel ?? alamosaGap?.gapLevel ?? "n/a"}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
