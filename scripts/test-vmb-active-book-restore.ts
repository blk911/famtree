/**
 * npm run test:vmb:active-book-restore
 */
import fs from "node:fs";
import path from "node:path";
import { getActiveBookPointer } from "../lib/vmb/active-book-pointer";
import { restoreActiveBookForSalon } from "../lib/vmb/active-book-restore";
import { resolveActiveBook } from "../lib/vmb/active-book-resolver";
import { shouldRunBookIngest } from "../lib/vmb/book-ingest-policy";
import { VMB_SAMPLE_BOOK_TEXT } from "../lib/vmb/sample-book";
import { runVmbBookAnalysis } from "../lib/vmb/run-book-analysis";
import { createVmbTrialLead } from "../lib/vmb/trial-store";
import { getWorkspaceForTrial, upsertWorkspaceForTrial } from "../lib/vmb/workspace-store";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

async function ingestSampleBook(trialId: string, salonName: string) {
  await upsertWorkspaceForTrial({
    trialId,
    salonName,
    providerPlatform: "vagaro",
  });
  const analyzed = await runVmbBookAnalysis({
    trialId,
    salonName,
    providerPlatform: "vagaro",
    rawText: VMB_SAMPLE_BOOK_TEXT,
    sourceType: "sample",
  });
  assert(analyzed.ok, "sample book ingest for restore test");
  if (!analyzed.ok) process.exit(1);
  return analyzed.data.analysis;
}

async function run(): Promise<void> {
  const sourceTrial = await createVmbTrialLead({
    salonName: "Restore Source Salon",
    ownerName: "Patty",
    email: `vmb-restore-source-${Date.now()}@salon.test`,
    providerPlatform: "vagaro",
  });
  if ("error" in sourceTrial) process.exit(1);

  const sourceAnalysis = await ingestSampleBook(sourceTrial.lead.id, sourceTrial.lead.salonName);

  const targetTrial = await createVmbTrialLead({
    salonName: "Restore Target Salon",
    ownerName: "Jenny",
    email: `vmb-restore-target-${Date.now()}@salon.test`,
    providerPlatform: "vagaro",
  });
  if ("error" in targetTrial) process.exit(1);
  const targetSalonId = targetTrial.lead.id;

  await upsertWorkspaceForTrial({
    trialId: targetSalonId,
    salonName: targetTrial.lead.salonName,
    providerPlatform: "vagaro",
  });

  const before = await resolveActiveBook(targetSalonId, {});
  assert(!before.hasActiveBook, "target salon starts without active book");

  const restored = await restoreActiveBookForSalon(targetSalonId, sourceAnalysis.analysisId);
  assert(restored.ok, "restore succeeds for cross-trial analysis");
  if (!restored.ok) process.exit(1);

  const pointer = await getActiveBookPointer(targetSalonId);
  assert(pointer?.analysisId === sourceAnalysis.analysisId, "active book pointer set for target salon");
  assert(pointer?.salonId === targetSalonId, "pointer salonId is current session");

  const workspace = await getWorkspaceForTrial(targetSalonId);
  assert(workspace?.latestAnalysisId === sourceAnalysis.analysisId, "workspace latestAnalysisId updated");
  assert(workspace?.firstIngestCompleted === true, "workspace firstIngestCompleted set");

  const resolved = await resolveActiveBook(targetSalonId, {});
  assert(resolved.hasActiveBook, "dashboard gate: resolveActiveBook passes after restore");
  assert(resolved.analysisId === sourceAnalysis.analysisId, "resolved analysisId matches restored book");
  assert(!!resolved.analysis, "resolved analysis payload loaded");

  assert(
    !shouldRunBookIngest(
      {
        workspace: workspace ?? undefined,
        activeBook: resolved,
      },
      {},
    ),
    "restore does not trigger implicit ingest",
  );

  const restoreRoute = read("app/api/vmb/active-book/restore/route.ts");
  assert(!restoreRoute.includes("analyze-book"), "restore route does not call analyze-book");
  assert(!restoreRoute.includes("runVmbBookAnalysis"), "restore route does not run book analysis");
  assert(restoreRoute.includes("restoreActiveBookForSalon"), "restore route uses restore helper");

  const restorePanel = read("components/vmb/RestoreExistingBookPanel.tsx");
  assert(!restorePanel.includes("/api/vmb/analyze-book"), "restore UI does not call analyze-book");
  assert(restorePanel.includes("/api/vmb/active-book/restore"), "restore UI posts restore endpoint");

  const bookAnalysesRoute = read("app/api/vmb/book-analyses/route.ts");
  assert(bookAnalysesRoute.includes("listBookAnalysisCatalog"), "book-analyses route lists catalog");

  const dashboardClient = read("components/vmb/VmbDashboardClient.tsx");
  assert(dashboardClient.includes("RestoreExistingBookPanel"), "dashboard empty state includes restore panel");

  console.log("OK: VMB active book restore tests passed");
  console.log(`  restored: ${restored.analysisId} -> ${restored.salonId}`);
}

void run();
