// scripts/build-report-acquisition.ts

import { buildReportAcquisitionEngine } from "@/lib/intelligence/reporting/build-report-acquisition-engine";

async function main(): Promise<void> {
  const result = await buildReportAcquisitionEngine();

  console.log("Report acquisition engine build complete");
  console.log(`Sources tracked: ${result.sources.sources.length}`);
  console.log(`  Discovered: ${result.sources.summary.discovered}`);
  console.log(`  Requested: ${result.sources.summary.requested}`);
  console.log(`  Acquired: ${result.sources.summary.acquired}`);
  console.log(`  Failed: ${result.sources.summary.failed}`);
  console.log(`  Not started: ${result.sources.summary.notStarted}`);
  console.log(`Acquired reports: ${result.sources.acquiredReports.length}`);
  console.log(`Metrics extracted: ${result.metrics.total}`);
  console.log(`Failure signals: ${result.failureSignals.total}`);
  console.log(`Records request targets: ${result.recordsTargets.total}`);
  console.log(`Live report targets: ${result.reportTargets.total}`);
  console.log(`  Request ready: ${result.reportTargets.summary.requestReady}`);
  console.log(`  Acquired: ${result.reportTargets.summary.acquired}`);
  console.log(`Request packages: ${result.requestPackages.total}`);
  console.log(`Request templates: ${result.requestTemplates.total}`);
  console.log(`Transpo opportunities updated: ${result.opportunitiesUpdated}`);
  console.log("");
  console.log("Top acquisition targets:");
  for (const t of result.reportTargets.targets.slice(0, 10)) {
    console.log(`  ${t.priority}. ${t.reportName} (${t.holder}) — ${t.status}`);
  }
  console.log("");
  console.log("Failure signal categories:");
  for (const [severity, count] of Object.entries(result.failureSignals.bySeverity)) {
    console.log(`  ${severity}: ${count}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
