// scripts/build-transpo-provider-capacity.ts

import { buildCountyCapacityDossiers } from "@/lib/transpo/build-county-capacity-dossiers";
import { buildProviderCapacityRegistry } from "@/lib/transpo/build-provider-capacity-registry";
import {
  COUNTY_CAPACITY_ARTIFACT_PATH,
  PROVIDER_CAPACITY_ARTIFACT_PATH,
} from "@/lib/transpo/paths";

async function main(): Promise<void> {
  const registry = await buildProviderCapacityRegistry();
  const capacity = await buildCountyCapacityDossiers();

  const regional = registry.providers.filter((p) => p.countyCount > 3 && p.countyCount <= 15).length;
  const statewide = registry.providers.filter((p) => p.countyCount > 15).length;

  console.log(`Providers: ${registry.totalProviders}`);
  console.log(`Counties: ${capacity.totalCounties}`);
  console.log(`Regional providers: ${regional}`);
  console.log(`Statewide providers: ${statewide}`);
  console.log(`Registry artifact: ${PROVIDER_CAPACITY_ARTIFACT_PATH}`);
  console.log(`County capacity artifact: ${COUNTY_CAPACITY_ARTIFACT_PATH}`);

  const alamosa = capacity.counties.find((c) => c.county === "Alamosa" && c.state === "CO");
  if (alamosa) {
    console.log("");
    console.log("Alamosa");
    console.log(`  Provider Count: ${alamosa.providerCount}`);
    console.log(`  Capacity Score: ${alamosa.capacityScore}`);
    console.log(`  Providers: ${alamosa.providers.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
