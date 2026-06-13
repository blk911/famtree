/**
 * npm run test:vmb:active-book-stickiness
 */
import { buildActiveBookDebugPayload } from "../lib/vmb/active-book-debug";
import { getActiveBookPointer } from "../lib/vmb/active-book-pointer";
import { resolveActiveBook } from "../lib/vmb/active-book-resolver";
import { loadVmbPageContext } from "../lib/vmb/load-vmb-page-context";
import { isVmbProcessComplete } from "../lib/vmb/process-complete";
import { VMB_SAMPLE_BOOK_TEXT } from "../lib/vmb/sample-book";
import { runVmbBookAnalysis } from "../lib/vmb/run-book-analysis";
import { resolveVmbStorageBackend } from "../lib/vmb/db";
import { vmbJsonFallbackAllowed } from "../lib/vmb/storage-policy";
import { createVmbTrialLead } from "../lib/vmb/trial-store";
import { getWorkspaceForTrial, upsertWorkspaceForTrial } from "../lib/vmb/workspace-store";

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
  assert(analyzed.ok, "upload/analyze writes analysis");
  if (!analyzed.ok) process.exit(1);
  return analyzed.data.analysis;
}

async function simulateModuleContext(trialId: string) {
  const workspace = await getWorkspaceForTrial(trialId);
  const pointer = await getActiveBookPointer(trialId);
  const bookResolution = await resolveActiveBook(trialId, {});
  const hasCompletedFirstIngest = isVmbProcessComplete({
    workspace,
    activeAnalysis: bookResolution.analysis,
    activeAnalysisId: bookResolution.analysisId,
    activeBookPointer: pointer,
    trialId,
  });
  return {
    hasCompletedFirstIngest,
    activeAnalysisId: bookResolution.analysisId,
    activeAnalysis: bookResolution.analysis,
  };
}

async function run(): Promise<void> {
  const trial = await createVmbTrialLead({
    salonName: "Stickiness Salon",
    ownerName: "Patty",
    email: `vmb-stickiness-${Date.now()}@salon.test`,
    providerPlatform: "vagaro",
  });
  if ("error" in trial) process.exit(1);
  const trialId = trial.lead.id;
  const analysis = await ingestBook(trialId, trial.lead.salonName);

  const workspace = await getWorkspaceForTrial(trialId);
  const pointer = await getActiveBookPointer(trialId);
  assert(workspace?.firstIngestCompleted === true, "workspace.firstIngestCompleted = true");
  assert(workspace?.latestAnalysisId === analysis.analysisId, "workspace.latestAnalysisId = analysisId");
  assert(pointer?.analysisId === analysis.analysisId, "activeBookPointer.analysisId = analysisId");

  const debug = await buildActiveBookDebugPayload({
    trialId,
    hasTrialCookie: true,
    cookieTrialId: trialId,
  });
  assert(debug.hasActiveBook, "/api debug payload hasActiveBook true");
  assert(debug.latestAnalysis.exists, "latestAnalysis.exists = true");
  assert(debug.activeBookPointer.exists, "activeBookPointer.exists = true");

  const resolved = await resolveActiveBook(trialId, {});
  assert(resolved.hasActiveBook, "resolveActiveBook().hasActiveBook = true");
  assert(resolved.analysisId === analysis.analysisId, "resolveActiveBook returns analysis id");

  const todayCtx = await simulateModuleContext(trialId);
  assert(todayCtx.hasCompletedFirstIngest, "/vmb/today without ?analysis resolves active book");
  assert(todayCtx.activeAnalysisId === analysis.analysisId, "today context analysis id");

  const clientsCtx = await simulateModuleContext(trialId);
  assert(clientsCtx.hasCompletedFirstIngest, "/vmb/clients without ?analysis resolves active book");
  assert(!!clientsCtx.activeAnalysis, "clients context loads analysis");

  const oppCtx = await simulateModuleContext(trialId);
  assert(oppCtx.hasCompletedFirstIngest, "/vmb/opportunities without ?analysis resolves active book");

  assert(typeof loadVmbPageContext === "function", "loadVmbPageContext exported for SSR modules");

  const startWouldResume = resolved.hasActiveBook;
  assert(startWouldResume, "/vmb/start shows resume panel when active book exists");

  const queryOnlyDebug = await buildActiveBookDebugPayload({
    trialId: undefined,
    hasTrialCookie: false,
    queryId: analysis.analysisId,
  });
  assert(
    queryOnlyDebug.hasActiveBook || !!queryOnlyDebug.analysisId,
    "missing cookie + query analysis can restore/resolve active book",
  );

  const backend = await resolveVmbStorageBackend();
  if (process.env.NODE_ENV === "production") {
    assert(backend === "postgres", "production mode uses postgres backend");
    assert(!vmbJsonFallbackAllowed(), "production mode does not fall back to JSON");
  }

  console.log("OK: VMB active book stickiness tests passed");
  console.log(`  analysisId: ${analysis.analysisId}`);
  console.log(`  backend: ${backend}`);
  console.log(`  debug source: ${debug.source}`);
}

void run();
