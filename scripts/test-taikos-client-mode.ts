/**
 * npm run test:taikos:client-mode
 */
import { answerSalonQuery } from "../lib/taikos/salon-qa/answer-salon-query";
import { matchSalonQuery } from "../lib/taikos/salon-qa/match-salon-query";
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
    trialId: `client-mode-${Date.now()}`,
    salonName: "Client Mode Salon",
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

  const tellMatch = matchSalonQuery("Tell me about Maya");
  assert(tellMatch.queryMode === "client", "tell me about classified client");
  assert(tellMatch.intent === "client_lookup", "client lookup intent");

  const historyMatch = matchSalonQuery("Show Riley's history");
  assert(historyMatch.queryMode === "client", "show history classified client");

  const servicesMatch = matchSalonQuery("What services did Maya receive?");
  assert(servicesMatch.queryMode === "client", "services received classified client");

  const dossier = answerSalonQuery({ question: "Tell me about Maya", analysis, records });
  assert(dossier.queryMode === "client", "client answer mode");
  assert(dossier.clientDossier !== undefined, "client lookup returns dossier");
  assert(dossier.clientDossier?.clientName.toLowerCase().includes("maya") === true, "dossier client name");
  assert((dossier.clientDossier?.visits ?? 0) > 0, "dossier includes visits");
  assert((dossier.clientDossier?.services.length ?? 0) > 0, "dossier includes services");
  assert(dossier.suggestedCards.length === 0, "client lookup does not override cards");

  const riley = answerSalonQuery({ question: "What services did Riley receive?", analysis, records });
  assert(riley.clientDossier?.clientName.toLowerCase().includes("riley") === true, "riley dossier");
  assert(
    (riley.clientDossier?.services ?? []).some((s) => s.toLowerCase().includes("birthday")) === true,
    "riley services include birthday blowout",
  );

  console.log("OK: TAIKOS client mode tests passed");
  console.log(`  dossier: ${dossier.clientDossier?.clientName}`);
  console.log(`  services: ${dossier.clientDossier?.services.join(", ")}`);
}

void run();
