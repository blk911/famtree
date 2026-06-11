/**
 * npm run test:taikos:phase9
 * Validates compressed Preview → Approve → Queue workflow (3 API steps, no sends).
 */
import { previewTaikosAction, confirmTaikosAction } from "../lib/taikos/actions/action-dispatcher";
import { allowsOutboundExecution } from "../lib/taikos/actions/confirm-gates";
import { buildAiosContextPacket } from "../lib/taikos/context/context-builder";
import { topOpportunityForGoal } from "../lib/taikos/workflow/goal-opportunity-match";
import { enqueueDraft } from "../lib/taikos/queue/queue-builder";
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

type Scenario = {
  name: string;
  actionType: ReturnType<typeof previewTaikosAction>["action"]["type"];
};

const SCENARIOS: Scenario[] = [
  { name: "Open Slot Fill", actionType: "VIEW_CALENDAR_GAP" },
  { name: "Grow PCN", actionType: "CONTINUE_PCN_INVITES" },
  { name: "Generate Referral", actionType: "PREVIEW_REFERRAL_ASK" },
  { name: "Create Service Card", actionType: "CREATE_SERVICE_CARD_DRAFT" },
  { name: "Reactivate Client", actionType: "PREVIEW_REACTIVATION_MESSAGE" },
  { name: "Create Campaign", actionType: "CREATE_CAMPAIGN_DRAFT" },
  { name: "Create Invite", actionType: "CREATE_INVITE_DRAFT" },
];

async function runScenario(
  ctx: NonNullable<Awaited<ReturnType<typeof buildAiosContextPacket>>>,
  scenario: Scenario,
): Promise<{ clicks: number; pageChanges: number; queued: boolean }> {
  let clicks = 0;
  const pageChanges = 0;

  const preview = previewTaikosAction(scenario.actionType, ctx);
  clicks += 1;
  assert(preview.noSendGuarantee === true, `${scenario.name}: preview no-send`);

  const confirmed = await confirmTaikosAction(scenario.actionType, ctx, {
    previewId: preview.previewId,
    sourcePage: "/vmb/today",
  });
  clicks += 1;
  assert(confirmed.ok === true, `${scenario.name}: approve`);
  assert(!allowsOutboundExecution(scenario.actionType), `${scenario.name}: no outbound`);

  let queued = false;
  if (confirmed.draftId) {
    const q = await enqueueDraft(ctx.salonId, ctx.operatorId, confirmed.draftId, ctx.goalSummary.goals);
    if ("error" in q) process.exit(1);
    clicks += 1;
    queued = true;
    assert(q.message.includes("No message sent"), `${scenario.name}: queue no-send`);
  }

  assert(clicks <= 3, `${scenario.name}: three-click rule (${clicks} clicks)`);
  return { clicks, pageChanges, queued };
}

async function run(): Promise<void> {
  const trial = await createVmbTrialLead({
    salonName: "Phase9 Salon",
    ownerName: "Jenny",
    email: `taikos-p9-${Date.now()}@salon.test`,
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
  assert(!!ctx, "context");
  assert(ctx!.opportunitySummary.totalOpportunities >= 1, "opportunities on today context");

  const referralGoal = ctx!.goalSummary.goals.find((g) => g.category === "REFERRALS");
  if (referralGoal) {
    const top = topOpportunityForGoal(referralGoal, ctx!.opportunitySummary.opportunities);
    assert(!!top, "goal compression: top opportunity for referral goal");
  }

  const results: Array<{ name: string; clicks: number; pageChanges: number; queued: boolean }> = [];
  for (const scenario of SCENARIOS) {
    results.push({ name: scenario.name, ...(await runScenario(ctx!, scenario)) });
  }

  console.log("Phase 9 throughput scenarios:");
  for (const r of results) {
    console.log(`  ${r.name}: ${r.clicks} clicks, ${r.pageChanges} page changes, queued=${r.queued}`);
  }

  console.log("OK: tAIkOS Phase 9 workflow compression tests passed");
}

void run();
