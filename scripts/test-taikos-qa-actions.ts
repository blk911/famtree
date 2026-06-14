/**
 * npm run test:taikos:qa-actions
 */
import { answerSalonQuery } from "../lib/taikos/salon-qa/answer-salon-query";
import {
  normalizeSalonQaSuggestedAction,
  submitQuestionForSalonQaAction,
} from "../lib/taikos/salon-qa/salon-qa-action-utils";
import {
  qaActionToCardPreview,
  qaPreviewTaikosAction,
} from "../lib/taikos/salon-qa/qa-action-to-card-preview";
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
    trialId: `qa-actions-${Date.now()}`,
    salonName: "QA Actions Salon",
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

  const january = answerSalonQuery({
    question: "Who were my January clients?",
    analysis,
    records,
  });
  assert(january.queryMode === "intelligence", "january stays intelligence");
  assert(january.suggestedCards.length === 0, "intelligence does not override feed initially");
  assert(january.suggestedAction?.kind === "follow_up_query", "january has follow up action");
  assert(
    january.suggestedAction?.label === "Find who never returned after January",
    "january action label",
  );
  assert(
    submitQuestionForSalonQaAction(january.suggestedAction) === "Who disappeared after January?",
    "january follow-up submit target",
  );

  const popular = answerSalonQuery({
    question: "What are my most popular services?",
    analysis,
    records,
  });
  assert(popular.suggestedAction?.kind === "follow_up_query", "popular services follow up");
  assert(
    popular.suggestedAction?.label === "Find clients due for those services",
    "popular services action label",
  );
  assert(
    submitQuestionForSalonQaAction(popular.suggestedAction) === "Who is due for my top services?",
    "popular services submit target",
  );

  const maya = answerSalonQuery({ question: "Tell me about Maya", analysis, records });
  assert(maya.queryMode === "client", "maya client mode");
  assert(
    maya.suggestedAction?.kind === "preview_card" || maya.suggestedAction?.kind === "follow_up_query",
    "maya returns preview or similar-clients action",
  );
  if (maya.suggestedAction?.kind === "preview_card") {
    const preview = qaActionToCardPreview(maya.suggestedAction, {
      salonName: "QA Actions Salon",
      records,
    });
    assert(preview.cardType.length > 0, "preview adapter returns card model");
    assert(
      preview.title.length > 0 || preview.body.length > 0 || !!preview.inviteCopy,
      "preview adapter has renderable content",
    );
    assert(qaPreviewTaikosAction(maya.suggestedAction).length > 0, "preview maps taikos action");
  }

  const legacy = normalizeSalonQaSuggestedAction({
    label: "Preview Private Client Invite",
    actionType: "preview_pcn_invite",
    clientName: "Maya Chen",
  });
  assert(legacy?.kind === "preview_card", "legacy action normalized");
  if (legacy?.kind === "preview_card") {
    assert(legacy.cardType === "pcn_invite", "legacy maps pcn card type");
  }

  const pcn = answerSalonQuery({ question: "Who should join my PCN?", analysis, records });
  assert(pcn.queryMode === "opportunity", "pcn opportunity mode");
  assert(pcn.suggestedCards.length > 0, "opportunity still generates cards");

  const followUp = answerSalonQuery({
    question: "Who disappeared after January?",
    analysis,
    records,
  });
  assert(followUp.queryMode === "intelligence", "inactive follow-up stays intelligence until opportunity");
  assert(followUp.suggestedCards.length === 0, "inactive follow-up does not auto override feed");

  const reconnect = answerSalonQuery({ question: "Who should I reconnect with?", analysis, records });
  assert(reconnect.queryMode === "opportunity", "reconnect follow-up can become opportunity");
  assert(reconnect.suggestedCards.length > 0, "reconnect opportunity generates cards");

  console.log("OK: TAIKOS Q&A action tests passed");
}

void run();
