/**
 * npm run test:taikos:boundary-policy
 */
import type { VmbBookAnalysisResult } from "../types/vmb/book-analysis";
import { answerSalonQuery } from "../lib/taikos/salon-qa/answer-salon-query";
import {
  boundaryAnswerContainsForbiddenLanguage,
  buildSalonQaBoundaryContext,
  classifySalonQaBoundary,
} from "../lib/taikos/salon-qa/boundary-policy";
import { matchSalonQuery } from "../lib/taikos/salon-qa/match-salon-query";
import { VMB_SAMPLE_BOOK_TEXT } from "../lib/vmb/sample-book";
import { runVmbBookAnalysis } from "../lib/vmb/run-book-analysis";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function loadSampleAnalysis() {
  const analyzed = await runVmbBookAnalysis({
    trialId: `boundary-${Date.now()}`,
    salonName: "Boundary Salon",
    providerPlatform: "glossgenius",
    rawText: VMB_SAMPLE_BOOK_TEXT,
    sourceType: "sample",
  });
  assert(analyzed.ok, "sample analysis loads");
  if (!analyzed.ok) process.exit(1);
  return analyzed.data.analysis;
}

function emptyAnalysis(): VmbBookAnalysisResult {
  return {
    analysisId: "empty-analysis",
    recordCount: 0,
    reactivationTargets: [],
    referralOpportunities: [],
    giftOpportunities: [],
    trustedProviderIntroOpportunities: [],
    estimatedRecoverableRevenue: 0,
    generatedAt: new Date().toISOString(),
  };
}

async function run(): Promise<void> {
  const analysis = await loadSampleAnalysis();
  const context = buildSalonQaBoundaryContext(analysis, []);

  assert(
    classifySalonQaBoundary("What's the weather?", matchSalonQuery("What's the weather?"), context).boundary ===
      "out_of_bounds",
    "weather is out_of_bounds",
  );
  assert(
    classifySalonQaBoundary("Who should I vote for?", matchSalonQuery("Who should I vote for?"), context).boundary ===
      "out_of_bounds",
    "politics is out_of_bounds",
  );
  assert(
    classifySalonQaBoundary("Diagnose this rash", matchSalonQuery("Diagnose this rash"), context).boundary ===
      "out_of_bounds",
    "medical is out_of_bounds",
  );
  assert(
    classifySalonQaBoundary("Send this to everyone", matchSalonQuery("Send this to everyone"), context).boundary ===
      "unsafe_action",
    "mass send is unsafe_action",
  );
  assert(
    classifySalonQaBoundary(
      "Text all overdue clients now",
      matchSalonQuery("Text all overdue clients now"),
      context,
    ).boundary === "unsafe_action",
    "mass text is unsafe_action",
  );
  assert(
    classifySalonQaBoundary("Who was that girl?", matchSalonQuery("Who was that girl?"), context).boundary ===
      "low_confidence",
    "vague pronoun is low_confidence",
  );

  const noBirthdayContext = { ...context, hasBirthdayData: false, clients: [] };
  assert(
    classifySalonQaBoundary(
      "Who has birthdays?",
      matchSalonQuery("Who has birthdays?"),
      noBirthdayContext,
    ).boundary === "missing_data",
    "birthdays without data is missing_data",
  );

  assert(
    classifySalonQaBoundary(
      "Who should join my PCN?",
      matchSalonQuery("Who should join my PCN?"),
      context,
    ).boundary === "in_bounds",
    "pcn question is in_bounds",
  );
  assert(
    classifySalonQaBoundary("Tell me about Maya", matchSalonQuery("Tell me about Maya"), context).boundary ===
      "in_bounds",
    "client lookup is in_bounds",
  );

  const weatherAnswer = answerSalonQuery({ question: "What's the weather?", analysis });
  assert(weatherAnswer.boundary === "out_of_bounds", "weather answer carries boundary");
  assert(weatherAnswer.queryMode === "intelligence", "boundary answers use intelligence mode");
  assert(weatherAnswer.suggestedCards.length === 0, "boundary answers do not override opportunity feed");
  assert(weatherAnswer.results.length === 0, "boundary answers have no fabricated results");
  assert(
    weatherAnswer.answerText.toLowerCase().includes("salon business"),
    "out_of_bounds uses standard salon reply",
  );
  assert(
    !boundaryAnswerContainsForbiddenLanguage(weatherAnswer.answerText),
    "boundary answer contains no forbidden generic response",
  );
  assert(
    (weatherAnswer.suggestedQuestions?.length ?? 0) > 0,
    "out_of_bounds includes suggested questions",
  );

  const mayaAnswer = answerSalonQuery({ question: "Tell me about Maya", analysis });
  assert(!mayaAnswer.boundary, "in-bounds client answer has no boundary flag");
  assert(mayaAnswer.queryMode === "client", "Maya routes to client mode");

  const pcnAnswer = answerSalonQuery({ question: "Who should join my PCN?", analysis });
  assert(!pcnAnswer.boundary, "in-bounds pcn answer has no boundary flag");
  assert(pcnAnswer.suggestedCards.length > 0, "in-bounds pcn still drives opportunity cards");

  const unsafeAnswer = answerSalonQuery({ question: "Send this to everyone", analysis });
  assert(unsafeAnswer.boundary === "unsafe_action", "unsafe integrated answer flagged");
  assert(unsafeAnswer.suggestedCards.length === 0, "unsafe answer does not override feed");

  const missingBirthdayAnswer = answerSalonQuery({
    question: "Who has birthdays?",
    analysis: emptyAnalysis(),
    records: [],
  });
  assert(missingBirthdayAnswer.boundary === "missing_data", "integrated missing birthday data");

  console.log("OK: TAIKOS boundary policy tests passed");
}

void run();
