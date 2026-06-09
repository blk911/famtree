// scripts/build-reporting-registry.ts

import { discoverReportingObligations } from "@/lib/intelligence/reporting/discover-reporting-obligations";

async function main(): Promise<void> {
  const bundle = await discoverReportingObligations();

  console.log("Reporting registry build complete");
  console.log(`Reports discovered: ${bundle.requiredReports.discovered}`);
  console.log(`Reporting unknown placeholders: ${bundle.requiredReports.reportingUnknown}`);
  console.log(`Total reports: ${bundle.requiredReports.total}`);
  console.log(`KPIs discovered: ${bundle.kpiRegistry.total}`);
  console.log(`Audit findings: ${bundle.auditFindings.total}`);
  console.log(`Stress signals: ${bundle.stressSignals.total}`);
  console.log("");
  console.log("Top entities by reporting value:");
  for (const e of bundle.stressSignals.summary.topReportingEntities.slice(0, 5)) {
    console.log(`  ${e.entityName}: ${e.score}`);
  }
  console.log("");
  console.log("Closest path to failure metrics:");
  for (const p of bundle.stressSignals.closestPathToFailureMetrics) {
    console.log(`  ${p.rank}. ${p.entityName} — ${p.metricSource}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
