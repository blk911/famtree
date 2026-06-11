/**
 * npm run test:taikos:phase1
 */
import { generateAiosResponse } from "../lib/taikos/adapters";
import { buildAiosContextPacket, greetingForOperator } from "../lib/taikos/context/context-builder";
import { buildClientSummaryFromAnalysis } from "../lib/taikos/context/client-summary-builder";
import { pathnameToPageId, resolvePageContext } from "../lib/taikos/context/page-registry";
import { buildMorningBriefing } from "../lib/taikos/orchestrator/morning-briefing";
import { runAllAiosRules } from "../lib/taikos/rules";
import { briefingVariant } from "../lib/taikos/session/session-manager";
import { VMB_SAMPLE_BOOK_TEXT } from "../lib/vmb/sample-book";
import { runVmbBookAnalysis } from "../lib/vmb/run-book-analysis";
import { createVmbTrialLead } from "../lib/vmb/trial-store";
import { upsertWorkspaceForTrial, setLatestAnalysis } from "../lib/vmb/workspace-store";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function run(): Promise<void> {
  assert(pathnameToPageId("/vmb/clients") === "clients", "page registry clients");
  assert(pathnameToPageId("/vmb/appointments") === "appointments", "page registry appointments");
  const page = resolvePageContext("/vmb/network");
  assert(page.pageId === "network", "network page context");
  assert(page.availableActions.length > 0, "network actions");
  assert(page.assistantIntro.length > 0, "assistant intro");

  const trial = await createVmbTrialLead({
    salonName: "tAIkOS Test Salon",
    ownerName: "Jenny",
    email: `taikos-${Date.now()}@salon.test`,
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
  if (!analyzed.ok) process.exit(1);
  await setLatestAnalysis(trialId, analyzed.data.analysis.analysisId);

  const ctx = await buildAiosContextPacket({
    trialId,
    pathname: "/vmb/dashboard",
    recordLogin: true,
  });
  assert(!!ctx, "context packet built");
  assert(ctx!.clientSummary.totalClients > 0, "client summary from real analysis");
  assert(ctx!.opportunities.length > 0, "rule opportunities");

  const rules = runAllAiosRules(analyzed.data.analysis);
  assert(rules.length > 0, "rules fire on sample book");

  const briefing = buildMorningBriefing(ctx!);
  assert(
    (briefing.greeting?.includes("Jenny") ?? false) || briefing.summary.includes("Jenny"),
    "greeting",
  );
  assert(briefing.variant !== "skip" || ctx!.currentSession.briefingShownToday, "briefing variant");

  const response = await generateAiosResponse({ context: ctx!, mode: "briefing" });
  assert(response.cards.length > 0 || response.summary.length > 0, "mock adapter response");
  assert(response.mode === "briefing" || response.mode === "page-assistant", "response mode");

  const assistant = await generateAiosResponse({ context: ctx!, mode: "page-assistant" });
  assert(assistant.pageContextLine !== undefined, "page assistant line");
  assert(Array.isArray(assistant.recommendedActions), "recommended actions array");

  assert(greetingForOperator("Salon", "Jenny").includes("Jenny"), "operator greeting");

  const variant = briefingVariant(ctx!.currentSession, ctx!.newActivity);
  assert(["full", "abbreviated", "activity-only", "skip"].includes(variant), "briefing variant enum");

  const summary = buildClientSummaryFromAnalysis(analyzed.data.analysis);
  assert(summary.totalClients > 0, "client summary builder");

  console.log("OK: tAIkOS Phase 1 tests passed");
}

void run();
