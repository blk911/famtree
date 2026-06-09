// scripts/build-transpo-opportunities.ts

import { buildTranspoOpportunities } from "@/lib/transpo/build-transpo-opportunities";

async function main(): Promise<void> {
  const artifact = await buildTranspoOpportunities();

  const high = artifact.summary.byConfidence.high ?? 0;
  const medium = artifact.summary.byConfidence.medium ?? 0;
  const low = artifact.summary.byConfidence.low ?? 0;

  console.log("Transpo opportunity synthesis complete");
  console.log(`Total opportunities: ${artifact.total}`);
  console.log(`High confidence: ${high}`);
  console.log(`Medium confidence: ${medium}`);
  console.log(`Low confidence: ${low}`);
  console.log("");
  console.log("By type:");
  for (const [type, count] of Object.entries(artifact.summary.byType)) {
    if (count > 0) console.log(`  ${type}: ${count}`);
  }
  console.log("");
  console.log("Top 10 by actionability:");
  const top10 = [...artifact.opportunities]
    .sort((a, b) => b.actionabilityScore - a.actionabilityScore)
    .slice(0, 10);
  for (const o of top10) {
    console.log(
      `  ${o.county} (${o.state}): ${o.opportunityType} · actionability ${o.actionabilityScore} · ${o.confidence} confidence`,
    );
  }

  const alamosa = artifact.opportunities.find(
    (o) => o.county === "Alamosa" && o.state === "CO",
  );
  console.log("");
  if (alamosa) {
    console.log("Alamosa classification:");
    console.log(`  Type: ${alamosa.opportunityType}`);
    console.log(`  Confidence: ${alamosa.confidence}`);
    console.log(`  Actionability: ${alamosa.actionabilityScore}`);
    console.log("  Rationale:");
    for (const line of alamosa.rationale) {
      console.log(`    - ${line}`);
    }
  } else {
    console.log("Alamosa: no opportunity classified");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
