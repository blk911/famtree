/**
 * npm run test:vmb:active-book-resolution
 */
import { getActiveBookPointer } from "../lib/vmb/active-book-pointer";
import { resolveActiveBook } from "../lib/vmb/active-book-resolver";
import { getActiveVmbAnalysis } from "../lib/vmb/active-analysis-resolver";
import { VMB_SAMPLE_BOOK_TEXT } from "../lib/vmb/sample-book";
import { runVmbBookAnalysis } from "../lib/vmb/run-book-analysis";
import { createVmbTrialLead } from "../lib/vmb/trial-store";
import { getWorkspaceForTrial, setLatestAnalysis, upsertWorkspaceForTrial } from "../lib/vmb/workspace-store";
import { saveWorkspacePostgres } from "../lib/vmb/workspace-store-postgres";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function ingestBook(trialId: string, salonName: string) {
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
  assert(analyzed.ok, "sample book ingest");
  if (!analyzed.ok) process.exit(1);
  await setLatestAnalysis(trialId, analyzed.data.analysis.analysisId);
  return analyzed.data.analysis;
}

async function run(): Promise<void> {
  const trial = await createVmbTrialLead({
    salonName: "Active Book Salon",
    ownerName: "Patty",
    email: `vmb-active-book-${Date.now()}@salon.test`,
    providerPlatform: "vagaro",
  });
  if ("error" in trial) process.exit(1);
  const trialId = trial.lead.id;
  const analysis = await ingestBook(trialId, trial.lead.salonName);

  const fromQuery = await resolveActiveBook(trialId, { queryId: analysis.analysisId });
  assert(fromQuery.source === "query", "query analysis wins");
  assert(fromQuery.analysisId === analysis.analysisId, "query returns analysis id");

  const fromWorkspace = await resolveActiveBook(trialId, {});
  assert(fromWorkspace.hasActiveBook, "workspace.latestAnalysisId works without query");
  assert(fromWorkspace.source === "workspace", "no-query resolves from workspace");
  assert(fromWorkspace.analysisId === analysis.analysisId, "workspace returns latest analysis id");

  const pointerTrial = await createVmbTrialLead({
    salonName: "Pointer Salon",
    ownerName: "Pointer",
    email: `vmb-pointer-${Date.now()}@salon.test`,
    providerPlatform: "vagaro",
  });
  if ("error" in pointerTrial) process.exit(1);
  const pointerTrialId = pointerTrial.lead.id;
  await upsertWorkspaceForTrial({
    trialId: pointerTrialId,
    salonName: pointerTrial.lead.salonName,
    providerPlatform: "vagaro",
  });
  const pointerAnalysis = await runVmbBookAnalysis({
    trialId: pointerTrialId,
    salonName: pointerTrial.lead.salonName,
    providerPlatform: "vagaro",
    rawText: VMB_SAMPLE_BOOK_TEXT,
    sourceType: "sample",
  });
  assert(pointerAnalysis.ok, "pointer trial ingest");
  if (!pointerAnalysis.ok) process.exit(1);
  const pointer = await getActiveBookPointer(pointerTrialId);
  assert(!!pointer, "pointer written on ingest");

  const pointerWorkspace = await getWorkspaceForTrial(pointerTrialId);
  assert(!!pointerWorkspace, "pointer trial workspace exists");
  await saveWorkspacePostgres({
    ...pointerWorkspace!,
    latestAnalysisId: undefined,
    firstIngestCompleted: false,
  });

  const fromPointer = await resolveActiveBook(pointerTrialId, {});
  assert(fromPointer.hasActiveBook, "activeBookPointer works without query");
  assert(fromPointer.source === "active_pointer", "pointer source when workspace latest missing");
  assert(fromPointer.analysisId === pointerAnalysis.data.analysis.analysisId, "pointer returns analysis id");

  await setLatestAnalysis(pointerTrialId, pointerAnalysis.data.analysis.analysisId);
  const latestTrial = await createVmbTrialLead({
    salonName: "Latest Salon",
    ownerName: "Latest",
    email: `vmb-latest-${Date.now()}@salon.test`,
    providerPlatform: "vagaro",
  });
  if ("error" in latestTrial) process.exit(1);
  const latestTrialId = latestTrial.lead.id;
  await upsertWorkspaceForTrial({
    trialId: latestTrialId,
    salonName: latestTrial.lead.salonName,
    providerPlatform: "vagaro",
  });
  const latestAnalysis = await runVmbBookAnalysis({
    trialId: latestTrialId,
    salonName: latestTrial.lead.salonName,
    providerPlatform: "vagaro",
    rawText: VMB_SAMPLE_BOOK_TEXT,
    sourceType: "sample",
  });
  assert(latestAnalysis.ok, "latest trial ingest");
  if (!latestAnalysis.ok) process.exit(1);

  const latestWorkspace = await getWorkspaceForTrial(latestTrialId);
  assert(!!latestWorkspace, "latest trial workspace exists");
  await saveWorkspacePostgres({
    ...latestWorkspace!,
    latestAnalysisId: undefined,
    firstIngestCompleted: false,
  });

  const fromLatest = await resolveActiveBook(latestTrialId, {});
  assert(fromLatest.hasActiveBook, "latest analysis fallback works");
  assert(
    fromLatest.source === "active_pointer" || fromLatest.source === "latest_analysis",
    "pointer or latest_analysis resolves without workspace latest",
  );
  assert(fromLatest.analysisId === latestAnalysis.data.analysis.analysisId, "latest analysis id returned");

  const emptyTrial = await createVmbTrialLead({
    salonName: "Empty Salon",
    ownerName: "Empty",
    email: `vmb-empty-${Date.now()}@salon.test`,
  });
  if ("error" in emptyTrial) process.exit(1);
  await upsertWorkspaceForTrial({
    trialId: emptyTrial.lead.id,
    salonName: emptyTrial.lead.salonName,
  });
  const none = await resolveActiveBook(emptyTrial.lead.id, {});
  assert(!none.hasActiveBook && none.source === "none", "no active book returns none");

  const legacy = await getActiveVmbAnalysis(trialId, { queryId: analysis.analysisId });
  assert(legacy.source === "query" && legacy.analysisId === analysis.analysisId, "legacy resolver still works");

  const workspace = await getWorkspaceForTrial(trialId);
  assert(!!workspace?.latestAnalysisId, "modules can resolve active book without query param");

  console.log("OK: VMB active book resolution tests passed");
}

void run();
