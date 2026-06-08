// scripts/build-transpo-demand-registry.ts

import { buildCountyDemandDossiers } from "@/lib/transpo/build-county-demand-dossiers";
import { buildDemandGeneratorRegistry } from "@/lib/transpo/build-demand-generator-registry";
import {
  COUNTY_DEMAND_DOSSIERS_ARTIFACT_PATH,
  DEMAND_GENERATORS_ARTIFACT_PATH,
} from "@/lib/transpo/paths";

async function main(): Promise<void> {
  const registry = await buildDemandGeneratorRegistry();
  const dossiersArtifact = await buildCountyDemandDossiers();

  console.log(`Total generators: ${registry.total}`);
  console.log(`County dossiers: ${dossiersArtifact.totalCounties}`);
  console.log(`Registry artifact: ${DEMAND_GENERATORS_ARTIFACT_PATH}`);
  console.log(`Dossiers artifact: ${COUNTY_DEMAND_DOSSIERS_ARTIFACT_PATH}`);
  console.log("");
  console.log("Source counts");
  for (const [source, meta] of Object.entries(registry.sources)) {
    console.log(`  ${source}: ${meta.count}`);
  }

  const alamosa = dossiersArtifact.dossiers.find(
    (d) => d.county.toLowerCase() === "alamosa" && d.state === "CO",
  );

  if (alamosa) {
    console.log("");
    console.log("Alamosa County dossier");
    console.log(`  demandScore: ${alamosa.demandScore}`);
    console.log(`  recurringDemandScore: ${alamosa.recurringDemandScore}`);
    console.log(`  ruralAnchorScore: ${alamosa.ruralAnchorScore}`);
    console.log("  countsByCategory:");
    for (const [cat, count] of Object.entries(alamosa.countsByCategory)) {
      console.log(`    ${cat}: ${count}`);
    }
    console.log(`  missingData: ${alamosa.missingData.join(", ")}`);
    console.log("  topAnchors:");
    for (const anchor of alamosa.topAnchors) {
      console.log(`    - ${anchor.displayName} (${anchor.category}, confidence ${anchor.confidence})`);
    }
  } else {
    console.log("");
    console.log("Alamosa County dossier: not found");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
