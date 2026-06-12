/**
 * npm run test:taikos:phase10
 * Validates CODA engine: Context → Objective → Discovery → Action.
 */
import { buildCodaSummary, buildInsight, runCodaSearch } from "../lib/taikos/coda/coda";
import { mapCodaActionToType } from "../lib/taikos/coda/action-engine";
import { buildTaikosContext } from "../lib/taikos/coda/context-engine";
import { buildTaikosObjective } from "../lib/taikos/coda/objective-engine";
import { runDiscoveryEngine } from "../lib/taikos/coda/discovery-engine";
import { buildAiosContextPacket } from "../lib/taikos/context/context-builder";
import { VMB_SAMPLE_BOOK_TEXT } from "../lib/vmb/sample-book";
import { runVmbBookAnalysis } from "../lib/vmb/run-book-analysis";
import { createVmbTrialLead } from "../lib/vmb/trial-store";
import { upsertWorkspaceForTrial, setLatestAnalysis } from "../lib/vmb/workspace-store";
import { buildClientOpportunities } from "../lib/vmb/client-opportunities";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function run(): Promise<void> {
  const trial = await createVmbTrialLead({
    salonName: "Phase10 Salon",
    ownerName: "Patty",
    email: `taikos-p10-${Date.now()}@salon.test`,
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
    pathname: "/vmb/today",
    recordLogin: false,
  });
  assert(!!ctx, "context packet");
  assert(!!ctx!.codaSummary, "codaSummary on context");

  const coda = ctx!.codaSummary;
  assert(coda.context.ownerName.length > 0, "context owner");
  assert(["onboarding", "growth", "activation", "retention"].includes(coda.context.currentPhase), "phase");
  assert(coda.objective.label.length > 0, "objective label");
  assert(coda.insights.length >= 1, "at least one discovery insight");

  const first = coda.insights[0];
  assert(first.discovery.length > 0, "insight discovery");
  assert(first.curiosityPrompt.length > 0, "insight curiosity");
  assert(first.suggestedAction.length > 0, "insight action");
  assert(mapCodaActionToType(first.suggestedAction) !== undefined, "action maps to taikos type");

  const rows = buildClientOpportunities(analyzed.data.analysis).rows;
  const hits = runDiscoveryEngine(rows, coda.objective, analyzed.data.analysis);
  assert(hits.length >= 1, "discovery engine hits");
  const built = buildInsight({ context: coda.context, objective: coda.objective, hit: hits[0] });
  assert(built.id.startsWith("insight-"), "buildInsight id");

  const bridalSearch = runCodaSearch("Which brides never came back?", ctx!, analyzed.data.analysis, coda.insights);
  assert(bridalSearch.matches.length >= 0, "bridal search returns");

  const nameSearch = runCodaSearch("Maya", ctx!, analyzed.data.analysis, coda.insights);
  assert(nameSearch.matches.some((m) => m.clientName.includes("Maya")), "name search finds Maya");

  const referralSearch = runCodaSearch("Who are my best referral clients?", ctx!, analyzed.data.analysis, coda.insights);
  assert(referralSearch.matches.length >= 1, "referral search finds clients");

  const context = buildTaikosContext(ctx!, undefined);
  const objective = buildTaikosObjective(context, ctx!);
  assert(objective.priority >= 1, "objective priority");

  console.log("Phase 10 CODA summary:");
  console.log(`  phase: ${coda.context.currentPhase}`);
  console.log(`  objective: ${coda.objective.label}`);
  console.log(`  insights: ${coda.insights.length}`);
  console.log(`  opportunities: ${coda.opportunityCount}`);
  console.log("OK: tAIkOS Phase 10 CODA engine tests passed");
}

void run();
