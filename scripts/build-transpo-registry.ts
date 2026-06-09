// scripts/build-transpo-registry.ts
// Full Transpo intelligence build: demand → provider capacity → dossiers → gap analysis.

import { buildCountyCapacityDossiers } from "@/lib/transpo/build-county-capacity-dossiers";
import { buildCountyDemandDossiers } from "@/lib/transpo/build-county-demand-dossiers";
import { buildCountyEvidenceDossiers } from "@/lib/transpo/build-county-evidence-dossiers";
import { buildResearchQueue } from "@/lib/transpo/build-research-queue";
import { buildTranspoOpportunities } from "@/lib/transpo/build-transpo-opportunities";
import { buildDemandGeneratorRegistry } from "@/lib/transpo/build-demand-generator-registry";
import { buildProviderCapacityRegistry } from "@/lib/transpo/build-provider-capacity-registry";
import { readCountyGapAnalysisArtifact } from "@/lib/transpo/read-provider-registry";

async function main(): Promise<void> {
  const demandRegistry = await buildDemandGeneratorRegistry();
  const providerRegistry = await buildProviderCapacityRegistry();
  const countyCapacity = await buildCountyCapacityDossiers();
  const demandDossiers = await buildCountyDemandDossiers();
  const evidenceResult = await buildCountyEvidenceDossiers();
  const evidenceDossiers = evidenceResult.artifact;
  const researchQueue = await buildResearchQueue();
  const opportunities = await buildTranspoOpportunities();
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
  console.log(`Evidence dossiers: ${evidenceDossiers.totalCounties}`);
  console.log(`Evidence overrides: ${evidenceResult.overrideCount}`);
  console.log(`Known overridden: ${evidenceResult.knownOverriddenCount}`);
  console.log(`Research tasks: ${researchQueue.queue.totalTasks}`);
  console.log(`Opportunities: ${opportunities.total}`);
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

    const alamosaEvidence = evidenceDossiers.dossiers.find(
      (d) => d.county === "Alamosa" && d.state === "CO",
    );
    if (alamosaEvidence) {
      console.log(`  Evidence Completeness: ${alamosaEvidence.evidenceCompletenessScore}%`);
      console.log(`  Research Priority: ${alamosaEvidence.researchPriority}`);
    }

    const alamosaOpp = opportunities.opportunities.find(
      (o) => o.county === "Alamosa" && o.state === "CO",
    );
    if (alamosaOpp) {
      console.log(`  Opportunity Type: ${alamosaOpp.opportunityType}`);
      console.log(`  Confidence: ${alamosaOpp.confidence}`);
      console.log(`  Actionability: ${alamosaOpp.actionabilityScore}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
