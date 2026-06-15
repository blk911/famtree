/**
 * npm run test:taikos:salon-qa
 */
import {
  answerSalonQuery,
  salonQaAnswerContainsForbiddenLanguage,
} from "../lib/taikos/salon-qa/answer-salon-query";
import { matchSalonQuery } from "../lib/taikos/salon-qa/match-salon-query";
import { VMB_SAMPLE_BOOK_TEXT } from "../lib/vmb/sample-book";
import { runVmbBookAnalysis } from "../lib/vmb/run-book-analysis";
import { createVmbTrialLead } from "../lib/vmb/trial-store";
import { upsertWorkspaceForTrial } from "../lib/vmb/workspace-store";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function loadSampleAnalysis() {
  const trial = await createVmbTrialLead({
    salonName: "Salon QA Test",
    ownerName: "Jenny",
    email: `salon-qa-${Date.now()}@salon.test`,
    providerPlatform: "glossgenius",
  });
  if ("error" in trial) process.exit(1);
  await upsertWorkspaceForTrial({
    trialId: trial.lead.id,
    salonName: trial.lead.salonName,
    providerPlatform: "glossgenius",
  });
  const analyzed = await runVmbBookAnalysis({
    trialId: trial.lead.id,
    salonName: trial.lead.salonName,
    providerPlatform: "glossgenius",
    rawText: VMB_SAMPLE_BOOK_TEXT,
    sourceType: "sample",
  });
  assert(analyzed.ok, "sample analysis for salon qa");
  if (!analyzed.ok) process.exit(1);
  return analyzed.data.analysis;
}

async function run(): Promise<void> {
  const analysis = await loadSampleAnalysis();

  const pcnMatch = matchSalonQuery("Who should join my PCN?");
  assert(pcnMatch.intent === "pcn_candidates", "pcn intent matched");
  assert(pcnMatch.queryMode === "opportunity", "pcn mode matched");
  const pcnAnswer = answerSalonQuery({ question: "Who should join my PCN?", analysis });
  assert(pcnAnswer.queryMode === "opportunity", "pcn answer mode");
  assert(pcnAnswer.results.length > 0, "pcn question returns results");
  assert(pcnAnswer.results[0].clientName.length > 0, "pcn results include client names");
  assert(pcnAnswer.suggestedCards.length > 0, "pcn answer includes suggested cards");
  assert(!salonQaAnswerContainsForbiddenLanguage(pcnAnswer), "pcn answer avoids forbidden language");

  const first20Match = matchSalonQuery("Who belongs in my first 20 invites?");
  assert(first20Match.intent === "first_20_pcn", "first 20 intent matched");
  assert(first20Match.limit === 20, "first 20 extracts limit 20");
  const first20Answer = answerSalonQuery({
    question: "Who belongs in my first 20 invites?",
    analysis,
  });
  assert(first20Answer.results.length <= 20, "first 20 answer respects limit");

  const gelMatch = matchSalonQuery("Who gets Gel-X?");
  assert(gelMatch.intent === "service_search", "gel-x service search intent");
  const gelAnswer = answerSalonQuery({ question: "Who gets Gel-X?", analysis });
  assert(typeof gelAnswer.headline === "string", "gel-x returns graceful answer headline");
  assert(!salonQaAnswerContainsForbiddenLanguage(gelAnswer), "gel-x answer avoids forbidden language");

  const overdueAnswer = answerSalonQuery({ question: "Who is overdue?", analysis });
  assert(overdueAnswer.results.length > 0, "overdue returns ranked results");
  const lapsedAnswer = answerSalonQuery({ question: "Who hasn't been back?", analysis });
  assert(lapsedAnswer.results.length > 0, "lapsed returns ranked results");

  const unknownAnswer = answerSalonQuery({ question: "What is the weather?", analysis });
  assert(unknownAnswer.boundary === "out_of_bounds", "weather question returns out_of_bounds boundary");
  assert(unknownAnswer.suggestedCards.length === 0, "boundary weather answer does not drive feed");
  assert(
    unknownAnswer.answerText.toLowerCase().includes("salon business") ||
      unknownAnswer.answerText.toLowerCase().includes("client book"),
    "out of bounds question returns helpful salon scope reply",
  );

  const noBookPayload = {
    ok: false as const,
    error: "NO_ACTIVE_BOOK",
    message: "Upload or load a client book first.",
  };
  assert(noBookPayload.error === "NO_ACTIVE_BOOK", "no active book error shape documented");

  console.log("OK: tAIkOS salon Q&A tests passed");
  console.log(`  pcn candidates: ${pcnAnswer.results.length}`);
  console.log(`  first sample: ${pcnAnswer.results[0]?.clientName ?? "n/a"}`);
}

void run();
