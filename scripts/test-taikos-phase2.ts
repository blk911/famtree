/**
 * npm run test:taikos:phase2
 */
import { generateAiosResponse } from "../lib/taikos/adapters";
import { buildAiosContextPacket } from "../lib/taikos/context/context-builder";
import { pageAssistantIntro, resolvePageContext } from "../lib/taikos/context/page-registry";
import { buildMorningBriefing } from "../lib/taikos/orchestrator/morning-briefing";
import { upsertSessionRecord } from "../lib/taikos/session/session-store";
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
  const clientsPage = resolvePageContext("/vmb/clients");
  assert(clientsPage.assistantIntro.includes("Clients"), "clients assistant intro");
  assert(pageAssistantIntro("/vmb/appointments").includes("Calendar"), "calendar intro");

  const trial = await createVmbTrialLead({
    salonName: "Phase2 Salon",
    ownerName: "Jenny",
    email: `taikos-p2-${Date.now()}@salon.test`,
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
    pathname: "/vmb/clients",
    recordLogin: true,
  });
  assert(!!ctx, "context");
  assert(ctx!.hasRealBookData, "real book data");
  assert(ctx!.contactCandidates.length > 0, "contact candidates from analysis");
  assert(ctx!.currentPage.assistantIntro.length > 0, "assistant intro on packet");

  const fullBrief = buildMorningBriefing(ctx!);
  assert(!!fullBrief.greeting?.includes("Jenny"), "full morning greeting");
  assert(fullBrief.showSunGreeting === true, "sun greeting on first brief");

  await upsertSessionRecord(trialId, ctx!.operatorId, {
    briefingShownToday: true,
    loginCountToday: 2,
    loginDayKey: new Date().toISOString().slice(0, 10),
  });

  const ctx2 = await buildAiosContextPacket({
    trialId,
    pathname: "/vmb/clients",
    recordLogin: false,
  });
  const secondBrief = buildMorningBriefing(ctx2!);
  assert(!(secondBrief.greeting ?? "").includes("Good Morning"), "second login skips Good Morning");
  assert(secondBrief.summary.includes("Hope your day"), "abbreviated second login copy");

  const assistant = await generateAiosResponse({ context: ctx!, mode: "page-assistant" });
  assert(assistant.layout === "center-panel", "center panel layout");
  assert(!!assistant.pageContextLine?.includes("Clients"), "page context line");
  assert(assistant.recommendedActions.length > 0, "recommended actions");
  assert(assistant.showQuestionInput !== false, "question input flag");

  const question = await generateAiosResponse({
    context: ctx!,
    mode: "question",
    question: "Who should I contact today?",
  });
  assert(question.mode === "question", "question mode");
  assert(question.cards.length > 0, "question cards");
  assert(
    question.cards[0].title !== "Sample Client A" || !ctx!.hasRealBookData,
    "real names when book exists",
  );

  const overdue = await generateAiosResponse({
    context: ctx!,
    mode: "question",
    question: "Show overdue clients",
  });
  assert(!!overdue.message?.includes("overdue"), "overdue question message");

  const next = await generateAiosResponse({
    context: ctx!,
    mode: "question",
    question: "What should I do next?",
  });
  assert(next.cards.length >= 1, "next steps cards");

  console.log("OK: tAIkOS Phase 2 tests passed");
}

void run();
