/**
 * npm run test:taikos:phase6
 */
import { allowsOutboundExecution } from "../lib/taikos/actions/confirm-gates";
import { recordActivity, summarizeActivityForSalon } from "../lib/taikos/activity/activity-builder";
import { buildAiosContextPacket } from "../lib/taikos/context/context-builder";
import { confirmTaikosAction, previewTaikosAction } from "../lib/taikos/actions/action-dispatcher";
import { executeQueueItem } from "../lib/taikos/execution/queue-dispatcher";
import { isExecutionAllowed, defaultExecutionStatus } from "../lib/taikos/execution/execution-status";
import { createGoal, listAllGoals, updateGoal } from "../lib/taikos/goals/goal-store";
import { summarizeAllGoals } from "../lib/taikos/goals/goal-summary";
import { buildRankedOpportunities } from "../lib/taikos/opportunities/opportunity-builder";
import { summarizeOpportunities } from "../lib/taikos/opportunities/opportunity-summary";
import { createDraft } from "../lib/taikos/drafts/draft-store";
import { enqueueDraft } from "../lib/taikos/queue/queue-builder";
import { listAllQueueItems, updateQueueItemStatus } from "../lib/taikos/queue/queue-store";
import { summarizeQueue } from "../lib/taikos/queue/queue-summary";
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

async function run(): Promise<void> {
  assert(!allowsOutboundExecution("CREATE_INVITE_DRAFT"), "no outbound execution");
  assert(!isExecutionAllowed(), "execution disabled");
  assert(defaultExecutionStatus() === "NOT_IMPLEMENTED", "default execution status");

  const trial = await createVmbTrialLead({
    salonName: "Phase6 Salon",
    ownerName: "Jenny",
    email: `taikos-p6-${Date.now()}@salon.test`,
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
  assert(typeof ctx!.activitySummary.totalEvents === "number", "activity summary on context");
  assert(typeof ctx!.queueSummary.blockedItems === "number", "queue blocked count");
  assert(typeof ctx!.goalSummary.completedGoals === "number", "goal completed count");

  await recordActivity({
    salonId: trialId,
    operatorId: "jenny",
    kind: "referral",
    emoji: "🤝",
    headline: "Amanda referred Jessica",
    estimatedValue: 120,
  });
  const activity = await summarizeActivityForSalon(trialId);
  assert(activity.recentEvents.length >= 1, "activity creation");
  assert(activity.recentEvents[0].headline.includes("Amanda"), "activity headline");

  const ranked = buildRankedOpportunities(ctx!, ctx!.goalSummary.goals);
  const oppSummary = summarizeOpportunities(ranked);
  assert(oppSummary.totalOpportunities >= 1, "opportunity ranking");

  const customGoal = await createGoal({
    salonId: trialId,
    operatorId: "jenny",
    title: "Q2 Revenue",
    category: "REVENUE",
    targetValue: 5000,
    currentValue: 1200,
    status: "active",
    priority: "high",
    notes: "Stretch target",
  });
  const edited = await updateGoal(trialId, customGoal.goalId, {
    currentValue: 1500,
    notes: "Updated notes",
  });
  assert(!!edited && edited.currentValue === 1500, "goal editing");

  const allGoals = await listAllGoals(trialId);
  const goalSummary = summarizeAllGoals(allGoals);
  assert(goalSummary.activeGoals >= 1, "goal center summary");

  const draft = await createDraft({
    salonId: trialId,
    operatorId: "jenny",
    sourcePage: "/vmb/opportunities",
    draftType: "campaign",
    title: "Thursday fill campaign",
    status: "draft",
    payload: { message: "We have an opening Thursday." },
    estimatedValue: 95,
    audit: {},
  });

  const queued = await enqueueDraft(trialId, "jenny", draft.draftId, ctx!.goalSummary.goals);
  if ("error" in queued) process.exit(1);
  assert(queued.item.status === "queued", "queue lifecycle enqueue");

  const ready = await updateQueueItemStatus(trialId, queued.item.queueId, "ready");
  assert(ready?.status === "ready", "queue mark ready");

  const queueItems = await listAllQueueItems(trialId);
  const queueSummary = summarizeQueue(queueItems);
  assert(queueSummary.readyItems >= 1, "queue summary ready");
  assert(Array.isArray(queueSummary.allItems), "queue all items");

  const exec = await executeQueueItem(trialId, "jenny", queued.item.queueId);
  if ("error" in exec) process.exit(1);
  assert(exec.status === "NOT_IMPLEMENTED", "execution stub behavior");
  assert(exec.noSendGuarantee === true, "no-send guarantee");
  assert(exec.noPaymentGuarantee === true, "no-payment guarantee");

  const preview = previewTaikosAction("CREATE_CAMPAIGN_DRAFT", ctx!);
  assert(preview.noSendGuarantee === true, "preview no send");

  const confirmed = await confirmTaikosAction("CREATE_INVITE_DRAFT", ctx!, {
    previewId: preview.previewId,
    sourcePage: "/vmb/invites",
  });
  assert(confirmed.ok === true, "confirm still works");

  const activityAfter = await summarizeActivityForSalon(trialId);
  assert(activityAfter.totalEvents >= 2, "activity from queue and confirm");

  console.log("OK: tAIkOS Phase 6 tests passed");
}

void run();
