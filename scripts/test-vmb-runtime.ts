/**
 * npm run test:vmb:runtime
 * VMB salon runtime handoff + nav href + active analysis resolver smoke tests.
 */
import { promises as fs } from "fs";
import { getActiveVmbAnalysis } from "../lib/vmb/active-analysis-resolver";
import { getVmbBookAnalysisForTrial } from "../lib/vmb/book-analysis/analysis-store";
import { workspaceLatestAnalysisId } from "../lib/vmb/workspace-lifecycle";
import { buildVmbSalonHref, VMB_ANALYSIS_ROUTES } from "../lib/vmb/salon-href";
import { VMB_SALON_NAV } from "../lib/vmb/salon-nav";
import { buildVmbSalonNavHref } from "../lib/vmb/salon-nav-href";
import { getWorkspaceForTrial, setLatestAnalysis, upsertWorkspaceForTrial } from "../lib/vmb/workspace-store";
import { VMB_SAMPLE_BOOK_TEXT } from "../lib/vmb/sample-book";
import { runVmbBookAnalysis } from "../lib/vmb/run-book-analysis";
import { createVmbTrialLead } from "../lib/vmb/trial-store";
import { analysisBelongsToTrial } from "../lib/vmb/trial-scope";
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
  const trialResult = await createVmbTrialLead({
    salonName: "Runtime Salon",
    ownerName: "Runtime Owner",
    email: `runtime-${Date.now()}@salon.test`,
    providerPlatform: "vagaro",
  });
  if ("error" in trialResult) {
    console.error(`FAIL: trial create: ${trialResult.error}`);
    process.exit(1);
  }
  const { lead } = trialResult;
  const trialId = lead.id;

  await upsertWorkspaceForTrial({
    trialId,
    salonName: lead.salonName,
    ownerName: lead.ownerName,
    email: lead.email,
    providerPlatform: "vagaro",
  });

  const analyzeOutcome = await runVmbBookAnalysis({
    trialId,
    salonName: lead.salonName,
    providerPlatform: "vagaro",
    rawText: VMB_SAMPLE_BOOK_TEXT,
    sourceType: "sample",
  });
  if (!analyzeOutcome.ok) {
    console.error(`FAIL: analyze: ${analyzeOutcome.error}`);
    process.exit(1);
  }
  const analysisId = analyzeOutcome.data.analysis.analysisId;

  await setLatestAnalysis(trialId, analysisId);
  const workspace = await getWorkspaceForTrial(trialId);
  assert(workspace?.latestAnalysisId === analysisId, "workspace.latestAnalysisId set after ingest");

  const latestNoQuery = await getActiveVmbAnalysis(trialId, {});
  assert(latestNoQuery.source === "workspace", "no-query resolves from workspace");
  assert(latestNoQuery.analysisId === analysisId, "no-query returns latest analysis id");

  const fromQuery = await getActiveVmbAnalysis(trialId, { queryId: analysisId });
  assert(fromQuery.source === "query" && fromQuery.analysisId === analysisId, "query id resolves");

  const badQuery = await getActiveVmbAnalysis(trialId, { queryId: "analysis-wrong-trial" });
  assert(
    badQuery.source === "workspace" && badQuery.analysisId === analysisId,
    "invalid query falls through to workspace latest",
  );

  const otherTrial = await createVmbTrialLead({
    salonName: "Other Salon",
    ownerName: "Other",
    email: `other-${Date.now()}@salon.test`,
  });
  if ("error" in otherTrial) process.exit(1);
  const cross = await getVmbBookAnalysisForTrial(analysisId, otherTrial.lead.id);
  assert(!cross, "cross-trial analysis read blocked");

  assert(
    analysisBelongsToTrial(analyzeOutcome.data.analysis, trialId),
    "analysis belongs to owning trial",
  );

  for (const route of Array.from(VMB_ANALYSIS_ROUTES)) {
    const href = buildVmbSalonHref(route, analysisId);
    assert(href.includes(`analysis=${encodeURIComponent(analysisId)}`), `${route} preserves analysis`);
  }

  assert(
    buildVmbSalonHref("/vmb/start?mode=refresh", analysisId) === "/vmb/start?mode=refresh",
    "book refresh omits analysis param",
  );
  assert(buildVmbSalonHref("/vmb/settings", analysisId) === "/vmb/settings", "settings omits analysis param");

  for (const item of VMB_SALON_NAV) {
    const href = buildVmbSalonNavHref(item, analysisId);
    assert(href.startsWith("/vmb"), `nav href valid for ${item.label}: ${href}`);
    assert(!href.includes("??"), `nav href not malformed for ${item.label}`);
  }

  const dashboardState = { ok: true as const, data: analyzeOutcome.data.analysis };
  assert(!!dashboardState.data, "dashboard renderable data state from latest analysis");

  await cleanupTestTrial(trialId);
  await cleanupTestTrial(otherTrial.lead.id);
  console.log("OK: VMB runtime handoff tests passed");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
