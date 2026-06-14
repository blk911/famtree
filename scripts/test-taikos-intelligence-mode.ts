/**
 * npm run test:taikos:intelligence-mode
 */
import { answerSalonQuery } from "../lib/taikos/salon-qa/answer-salon-query";
import { matchSalonQuery } from "../lib/taikos/salon-qa/match-salon-query";
import { parseSalonDateRange } from "../lib/taikos/salon-qa/date-parser";
import { parseBookUpload } from "../lib/vmb/provider-ingest/parse-book-upload";
import { VMB_SAMPLE_BOOK_TEXT } from "../lib/vmb/sample-book";
import { runVmbBookAnalysis } from "../lib/vmb/run-book-analysis";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function loadAnalysisAndRecords() {
  const analyzed = await runVmbBookAnalysis({
    trialId: `intel-mode-${Date.now()}`,
    salonName: "Intelligence Mode Salon",
    providerPlatform: "glossgenius",
    rawText: VMB_SAMPLE_BOOK_TEXT,
    sourceType: "sample",
  });
  assert(analyzed.ok, "sample analysis loads");
  if (!analyzed.ok) process.exit(1);
  const parsed = parseBookUpload({ rawText: VMB_SAMPLE_BOOK_TEXT, providerPlatform: "glossgenius" });
  return { analysis: analyzed.data.analysis, records: parsed.records };
}

async function run(): Promise<void> {
  const { analysis, records } = await loadAnalysisAndRecords();

  const janMatch = matchSalonQuery("Who were my January clients?");
  assert(janMatch.queryMode === "intelligence", "january query classified intelligence");
  assert(janMatch.intent === "monthly_clients", "january intent is monthly_clients");

  const pcnMatch = matchSalonQuery("Who should join my PCN?");
  assert(pcnMatch.queryMode === "opportunity", "pcn query classified opportunity");

  const clientMatch = matchSalonQuery("Tell me about Maya");
  assert(clientMatch.queryMode === "client", "client lookup classified client");

  const janAnswer = answerSalonQuery({
    question: "Who were my January clients?",
    analysis,
    records,
  });
  assert(janAnswer.queryMode === "intelligence", "january answer mode intelligence");
  assert(janAnswer.suggestedCards.length === 0, "intelligence query does not generate cards");
  assert((janAnswer.intelligence?.rows?.length ?? 0) > 0, "january answer includes client rows");
  assert(
    (janAnswer.intelligence?.rows ?? []).some((r) => r.name.toLowerCase().includes("riley")),
    "january clients include Riley from sample book",
  );

  const pcnAnswer = answerSalonQuery({ question: "Who should join my PCN?", analysis, records });
  assert(pcnAnswer.queryMode === "opportunity", "pcn answer mode opportunity");
  assert(pcnAnswer.suggestedCards.length > 0, "opportunity query still generates cards");

  const popular = answerSalonQuery({
    question: "What are my most popular services?",
    analysis,
    records,
  });
  assert(popular.queryMode === "intelligence", "popular services is intelligence");
  assert((popular.intelligence?.rows?.length ?? 0) > 0, "popular services returns ranked rows");

  const janRange = parseSalonDateRange("January 2026");
  assert(janRange?.month === 1, "month parser january month");
  assert(janRange?.year === 2026, "month parser january year");
  const lastMonth = parseSalonDateRange("last month", new Date("2026-06-15T12:00:00Z"));
  assert(lastMonth?.month === 5, "last month parser from June reference");

  console.log("OK: TAIKOS intelligence mode tests passed");
  console.log(`  january clients: ${janAnswer.intelligence?.rows?.length ?? 0}`);
  console.log(`  pcn cards: ${pcnAnswer.suggestedCards.length}`);
}

void run();
