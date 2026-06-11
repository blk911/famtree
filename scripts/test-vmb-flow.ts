/**
 * npm run test:vmb:flow
 * Simulates VMB handoff: trial → analyze sample → workspace latest → GET latest without id.
 */
import { promises as fs } from "fs";
import { getVmbBookAnalysisForTrial } from "../lib/vmb/book-analysis/analysis-store";
import { workspaceLatestAnalysisId } from "../lib/vmb/workspace-lifecycle";
import { getWorkspaceForTrial, setLatestAnalysis, upsertWorkspaceForTrial } from "../lib/vmb/workspace-store";
import { VMB_SAMPLE_BOOK_TEXT } from "../lib/vmb/sample-book";
import { runVmbBookAnalysis } from "../lib/vmb/run-book-analysis";
import { createVmbTrialLead } from "../lib/vmb/trial-store";
import { validateVmbStartFlowSubmit } from "../lib/vmb/start-flow-validation";
import { getVmbTrialsFile } from "../lib/vmb/paths";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function cleanupTestTrial(trialId: string): Promise<void> {
  try {
    const raw = await fs.readFile(getVmbTrialsFile(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const kept = parsed.filter(
      (t) =>
        typeof t === "object" &&
        t &&
        typeof (t as { id?: string }).id === "string" &&
        (t as { id: string }).id !== trialId,
    );
    await fs.writeFile(getVmbTrialsFile(), JSON.stringify(kept, null, 2), "utf8");
  } catch {
    // no file yet
  }
}

async function run(): Promise<void> {
  const missingProvider = validateVmbStartFlowSubmit({
    provider: "",
    ownerName: "Alex",
    email: "alex@salon.test",
    hasBookData: true,
  });
  assert(!missingProvider.ok && missingProvider.field === "provider", "start validation requires provider");

  const missingBook = validateVmbStartFlowSubmit({
    provider: "glossgenius",
    ownerName: "Alex",
    email: "alex@salon.test",
    hasBookData: false,
  });
  assert(!missingBook.ok && missingBook.field === "book", "start validation requires book data");

  const ready = validateVmbStartFlowSubmit({
    provider: "glossgenius",
    ownerName: "Alex",
    email: "alex@salon.test",
    hasBookData: true,
  });
  assert(ready.ok, "start validation passes when requirements met");

  const trialResult = await createVmbTrialLead({
    salonName: "Flow Test Salon",
    ownerName: "Flow Owner",
    email: `flow-${Date.now()}@salon.test`,
    providerPlatform: "glossgenius",
  });
  if ("error" in trialResult) {
    console.error(`FAIL: trial create succeeds: ${trialResult.error}`);
    process.exit(1);
  }
  const { lead } = trialResult;
  const trialId = lead.id;

  const workspaceUpsert = await upsertWorkspaceForTrial({
    trialId,
    salonName: lead.salonName,
    ownerName: lead.ownerName,
    email: lead.email,
    providerPlatform: "glossgenius",
  });
  assert(!("error" in workspaceUpsert), "workspace upsert on trial create succeeds");

  const analyzeOutcome = await runVmbBookAnalysis({
    trialId,
    salonName: lead.salonName,
    providerPlatform: "glossgenius",
    rawText: VMB_SAMPLE_BOOK_TEXT,
    sourceType: "sample",
  });
  if (!analyzeOutcome.ok) {
    console.error(`FAIL: analyze sample book succeeds: ${analyzeOutcome.error}`);
    process.exit(1);
  }
  const analysisId = analyzeOutcome.data.analysis.analysisId;

  const workspaceUpdate = await setLatestAnalysis(trialId, analysisId);
  assert(!("error" in workspaceUpdate), "workspace latestAnalysisId set after analyze");

  const workspace = await getWorkspaceForTrial(trialId);
  assert(workspace?.latestAnalysisId === analysisId, "workspace stores latest analysis id");

  const latestId = workspaceLatestAnalysisId(workspace);
  assert(latestId === analysisId, "workspaceLatestAnalysisId resolves without query param");

  const latestAnalysis = latestId
    ? await getVmbBookAnalysisForTrial(latestId, trialId)
    : undefined;
  assert(!!latestAnalysis, "GET analyze-book with no id would return latest for trial");
  assert(latestAnalysis?.analysisId === analysisId, "latest analysis matches ingested analysis");

  await cleanupTestTrial(trialId);
  console.log("OK: VMB flow handoff tests passed");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
