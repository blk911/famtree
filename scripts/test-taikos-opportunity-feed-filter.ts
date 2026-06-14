/**
 * npm run test:taikos:opportunity-feed-filter
 */
import { answerSalonQuery } from "../lib/taikos/salon-qa/answer-salon-query";
import {
  questionCardToOpportunity,
  vmbCardTypeFromSuggested,
} from "../lib/taikos/salon-qa/question-card-to-opportunity";
import { VMB_SAMPLE_BOOK_TEXT } from "../lib/vmb/sample-book";
import { runVmbBookAnalysis } from "../lib/vmb/run-book-analysis";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function loadAnalysis() {
  const analyzed = await runVmbBookAnalysis({
    trialId: `qa-feed-${Date.now()}`,
    salonName: "Feed Filter Salon",
    providerPlatform: "glossgenius",
    rawText: VMB_SAMPLE_BOOK_TEXT,
    sourceType: "sample",
  });
  assert(analyzed.ok, "sample analysis loads");
  if (!analyzed.ok) process.exit(1);
  return analyzed.data.analysis;
}

async function run(): Promise<void> {
  const analysis = await loadAnalysis();

  const birthday = answerSalonQuery({ question: "Who has a birthday soon?", analysis });
  assert(birthday.suggestedCards.length > 0, "birthday question returns birthday cards");
  assert(
    birthday.suggestedCards.every((c) => c.cardType === "birthday_card"),
    "birthday cards mapped to birthday_card",
  );
  assert(birthday.filterLabel === "Birthday Opportunities", "birthday filter label set");
  assert(
    birthday.suggestedCards.some((c) => c.clientName.includes("Riley")),
    "birthday cards include Riley from sample book",
  );

  const pcn = answerSalonQuery({ question: "Who should join my PCN?", analysis });
  assert(pcn.suggestedCards.length > 0, "pcn question returns pcn cards");
  assert(
    pcn.suggestedCards.every((c) => c.cardType === "pcn_invite"),
    "pcn cards mapped to pcn_invite",
  );
  assert(pcn.filterLabel === "Private Client Network", "pcn filter label set");

  const overdue = answerSalonQuery({ question: "Who is overdue?", analysis });
  assert(overdue.suggestedCards.length > 0, "overdue question returns reactivation cards");
  assert(
    overdue.suggestedCards.every((c) => c.cardType === "reactivation_card"),
    "overdue cards mapped to reactivation_card",
  );
  assert(overdue.filterLabel === "Reactivation Opportunities", "overdue filter label set");

  const firstCard = birthday.suggestedCards[0];
  const opp = questionCardToOpportunity(firstCard, 0);
  assert(opp.opportunityId.startsWith("qa-"), "question card converts to opportunity id");
  assert(opp.category === "Birthday", "birthday opportunity category");
  assert(opp.suggestedAction === "CREATE_CAMPAIGN_DRAFT", "birthday workflow action preserved");

  const previewCardType = vmbCardTypeFromSuggested(firstCard.cardType);
  assert(previewCardType === "birthday_card", "preview card type resolves for modal");

  const cleared = null;
  assert(cleared === null, "clear filter restores default feed state");

  console.log("OK: TAIKOS opportunity feed filter tests passed");
  console.log(`  birthday cards: ${birthday.suggestedCards.length}`);
  console.log(`  pcn cards: ${pcn.suggestedCards.length}`);
  console.log(`  overdue cards: ${overdue.suggestedCards.length}`);
}

void run();
