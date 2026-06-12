/**
 * npm run test:vmb:book-state
 * After ingest: Today, Clients, and tAIkOS agree book is loaded.
 */
import { mockAiosAdapter } from "../lib/taikos/adapters/mock";
import { hasLoadedBookData } from "../lib/taikos/context/has-loaded-book";
import { buildAiosContextPacket } from "../lib/taikos/context/context-builder";
import { buildClientOpportunities } from "../lib/vmb/client-opportunities";
import { getActiveBookPointer } from "../lib/vmb/active-book-pointer";
import { importedClientCount, resolveBookLoadedState } from "../lib/vmb/book-status";
import { VMB_SAMPLE_BOOK_TEXT } from "../lib/vmb/sample-book";
import { runVmbBookAnalysis } from "../lib/vmb/run-book-analysis";
import { createVmbTrialLead } from "../lib/vmb/trial-store";
import { upsertWorkspaceForTrial, setLatestAnalysis } from "../lib/vmb/workspace-store";
import { getActiveVmbAnalysis } from "../lib/vmb/active-analysis-resolver";
import { isVmbProcessComplete } from "../lib/vmb/process-complete";
import { getWorkspaceForTrial } from "../lib/vmb/workspace-store";
import type { VmbBookAnalysisResult } from "../types/vmb/book-analysis";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function clientsPageWouldLoad(
  ctx: NonNullable<Awaited<ReturnType<typeof buildAiosContextPacket>>>,
  analysis: VmbBookAnalysisResult,
): "ready" | "imported_summary" | "not_loaded" {
  const built = buildClientOpportunities(analysis);
  const loaded = resolveBookLoadedState({
    hasRealBookData: ctx.hasRealBookData,
    clientSummary: ctx.clientSummary,
    codaSummary: ctx.codaSummary,
    analysisId: ctx.analysisId,
    recordCount: ctx.recordCount ?? analysis.recordCount,
    clients: built.rows,
  });
  if (!loaded) return "not_loaded";
  return built.rows.length > 0 ? "ready" : "imported_summary";
}

function todayPageWouldShowConnect(processComplete: boolean): boolean {
  return !processComplete;
}

async function run(): Promise<void> {
  const trial = await createVmbTrialLead({
    salonName: "Book State Salon",
    ownerName: "Patty",
    email: `vmb-book-state-${Date.now()}@salon.test`,
    providerPlatform: "vagaro",
  });
  if ("error" in trial) process.exit(1);
  const trialId = trial.lead.id;

  await upsertWorkspaceForTrial({
    trialId,
    salonName: trial.lead.salonName,
    ownerName: trial.lead.ownerName,
    email: trial.lead.email,
    providerPlatform: "vagaro",
  });

  const analyzed = await runVmbBookAnalysis({
    trialId,
    salonName: trial.lead.salonName,
    providerPlatform: "vagaro",
    rawText: VMB_SAMPLE_BOOK_TEXT,
    sourceType: "sample",
  });
  assert(analyzed.ok, "ingest book.c / sample book");
  if (!analyzed.ok) process.exit(1);
  const analysis = analyzed.data.analysis;
  await setLatestAnalysis(trialId, analysis.analysisId);

  const workspace = await getWorkspaceForTrial(trialId);
  assert(
    isVmbProcessComplete({
      workspace,
      activeAnalysis: analysis,
      activeAnalysisId: analysis.analysisId,
      trialId,
    }),
    "process complete after ingest",
  );

  const pointer = await getActiveBookPointer(trialId);
  assert(!!pointer, "active-book pointer written");
  assert(pointer!.salonId === trialId, "pointer salonId matches ingest");
  assert(pointer!.analysisId === analysis.analysisId, "pointer analysisId matches ingest");
  assert(pointer!.recordCount > 0, "pointer recordCount > 0");
  assert(pointer!.clientCount > 0, "pointer clientCount > 0");

  const ctxToday = await buildAiosContextPacket({
    trialId,
    pathname: "/vmb/today",
    recordLogin: false,
  });
  assert(!!ctxToday, "today context");
  assert(hasLoadedBookData(ctxToday!), "today: hasLoadedBookData");
  assert(resolveBookLoadedState({
    hasRealBookData: ctxToday!.hasRealBookData,
    clientSummary: ctxToday!.clientSummary,
    codaSummary: ctxToday!.codaSummary,
    analysisId: ctxToday!.analysisId,
    recordCount: ctxToday!.recordCount,
  }), "today: resolveBookLoadedState");
  assert(
    !todayPageWouldShowConnect(
      isVmbProcessComplete({
        workspace,
        activeAnalysis: analysis,
        activeAnalysisId: analysis.analysisId,
        trialId,
      }),
    ),
    "today must not show Connect your book after ingest",
  );
  assert((ctxToday!.recordCount ?? 0) > 0, "today context recordCount > 0");
  assert(ctxToday!.clientSummary.totalClients > 0, "today context totalClients > 0");
  assert(ctxToday!.codaSummary.context.importedClientCount > 0, "today importedClientCount > 0");

  const ctxClients = await buildAiosContextPacket({
    trialId,
    pathname: "/vmb/clients",
    recordLogin: false,
  });
  assert(!!ctxClients, "clients context");
  assert(hasLoadedBookData(ctxClients!), "clients context: hasLoadedBookData");
  assert(resolveBookLoadedState({
    hasRealBookData: ctxClients!.hasRealBookData,
    clientSummary: ctxClients!.clientSummary,
    codaSummary: ctxClients!.codaSummary,
    analysisId: ctxClients!.analysisId,
    recordCount: ctxClients!.recordCount,
  }), "clients: resolveBookLoadedState");

  const clientsState = clientsPageWouldLoad(ctxClients!, analysis);
  assert(clientsState === "ready", `clients page state is ${clientsState}, expected ready`);

  const built = buildClientOpportunities(analysis);
  assert(built.rows.length > 0, "client opportunity rows");
  assert(importedClientCount({
    clientSummary: ctxClients!.clientSummary,
    codaSummary: ctxClients!.codaSummary,
    recordCount: ctxClients!.recordCount ?? analysis.recordCount,
    clients: built.rows,
  }) > 0, "imported client count");

  const resolved = await getActiveVmbAnalysis(trialId);
  assert(!!resolved.analysisId, "active analysis id");

  const taikosPage = await mockAiosAdapter({
    context: ctxToday!,
    mode: "page-assistant",
  });
  assert(
    !taikosPage.message?.includes("Complete Find The Money"),
    "tAIkOS must not prompt to load data when book is loaded",
  );

  console.log("Phase book-state:");
  console.log(`  pointer: ${pointer!.analysisId} (${pointer!.recordCount} records)`);
  console.log(`  today loaded: ${hasLoadedBookData(ctxToday!)}`);
  console.log(`  clients loaded: ${hasLoadedBookData(ctxClients!)}`);
  console.log(`  clients rows: ${built.rows.length}`);
  console.log(`  clients page: ${clientsState}`);
  console.log("OK: VMB book-state alignment tests passed");
}

void run();
