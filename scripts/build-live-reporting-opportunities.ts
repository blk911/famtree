// scripts/build-live-reporting-opportunities.ts

import { buildLiveOpportunityTargets } from "@/lib/intelligence/reporting/build-live-opportunities";

async function main(): Promise<void> {
  const artifact = await buildLiveOpportunityTargets();

  console.log("Live reporting opportunity decision engine build complete");
  console.log(`Total targets: ${artifact.total}`);
  console.log(`Request ready: ${artifact.summary.requestReady}`);
  console.log(`High confidence: ${artifact.summary.highConfidence}`);
  console.log(`Top decision score: ${artifact.summary.topDecisionScore}`);
  console.log("");
  console.log("Top 3 targets:");
  for (const t of artifact.targets.slice(0, 3)) {
    console.log(`  ${t.rank}. ${t.targetName} — score ${t.decisionScore} (${t.confidence})`);
  }
  console.log("");
  console.log("Start here:");
  for (const item of artifact.startHere) {
    console.log(`  ${item.rank}. ${item.targetName} — ${item.acquisitionStatus}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
