// scripts/build-transpo-evidence.ts

import { buildCountyEvidenceDossiers } from "@/lib/transpo/build-county-evidence-dossiers";

async function main(): Promise<void> {
  const artifact = await buildCountyEvidenceDossiers();

  console.log("Transpo evidence registry build complete");
  console.log(`Counties: ${artifact.totalCounties}`);

  const alamosa = artifact.dossiers.find((d) => d.county === "Alamosa" && d.state === "CO");
  if (alamosa) {
    console.log("");
    console.log("Alamosa");
    console.log(`  Known: ${alamosa.knownCount}`);
    console.log(`  Inferred: ${alamosa.inferredCount}`);
    console.log(`  Missing: ${alamosa.missingCount}`);
    console.log(`  Evidence Completeness: ${alamosa.evidenceCompletenessScore}%`);
    console.log(`  Research Priority: ${alamosa.researchPriority}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
