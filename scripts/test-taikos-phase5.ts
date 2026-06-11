/**
 * npm run test:taikos:phase5
 */
import { allowsOutboundExecution } from "../lib/taikos/actions/confirm-gates";
import { buildAiosContextPacket } from "../lib/taikos/context/context-builder";
import { answerMockQuestion } from "../lib/taikos/adapters/mock-questions";
import { createGoal, listGoals, updateGoal } from "../lib/taikos/goals/goal-store";
import { buildMorningBriefing } from "../lib/taikos/orchestrator/morning-briefing";
import { buildRankedOpportunities } from "../lib/taikos/opportunities/opportunity-builder";
import { scoreOpportunity } from "../lib/taikos/opportunities/opportunity-score";
import { summarizeOpportunities } from "../lib/taikos/opportunities/opportunity-summary";
import { createDraft } from "../lib/taikos/drafts/draft-store";
import { enqueueDraft } from "../lib/taikos/queue/queue-builder";
import { listQueueItems } from "../lib/taikos/queue/queue-store";
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
  const trial = await createVmbTrialLead({
    salonName: "Phase5 Salon",
    ownerName: "Jenny",
    email: `taikos-p5-${Date.now()}@salon.test`,
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
  assert(ctx!.goalSummary.activeGoals >= 1, "default goals created");
  assert(ctx!.opportunitySummary.totalOpportunities >= 1, "opportunity summary");
  assert(typeof ctx!.queueSummary.queuedItems === "number", "queue summary");

  const custom = await createGoal({
    salonId: trialId,
    operatorId: "jenny",
    title: "Custom retention goal",
    category: "CLIENT_RETENTION",
    targetValue: 50,
    currentValue: 10,
    status: "active",
  });
  assert(!!custom.goalId, "create goal");

  const listed = await listGoals(trialId);
  assert(listed.length >= 4, "list goals");

  const updated = await updateGoal(trialId, custom.goalId, { currentValue: 25 });
  assert(updated?.currentValue === 25, "update goal");

  const { priority } = scoreOpportunity(180, 82, true);
  assert(priority === "High", "opportunity scoring high");

  const ranked = buildRankedOpportunities(ctx!, ctx!.goalSummary.goals);
  assert(ranked.length >= 1, "ranked opportunities");
  const oppSummary = summarizeOpportunities(ranked);
  assert(!!oppSummary.topOpportunity, "top opportunity");

  const draft = await createDraft({
    salonId: trialId,
    operatorId: "jenny",
    sourcePage: "/vmb/today",
    draftType: "referral_ask",
    title: "Referral ask draft",
    status: "draft",
    payload: { message: "Would you refer a friend?" },
    estimatedValue: 180,
    audit: {},
  });

  const queued = await enqueueDraft(trialId, "jenny", draft.draftId, ctx!.goalSummary.goals);
  if ("error" in queued) process.exit(1);
  assert(queued.item.status === "queued", "enqueue draft");

  const queueItems = await listQueueItems(trialId);
  const queueSummary = summarizeQueue(queueItems);
  assert(queueSummary.queuedItems >= 1, "queue summary");

  const briefing = buildMorningBriefing(ctx!);
  assert(briefing.summary.includes("active goal"), "briefing mentions goals");
  assert(briefing.followUpPrompt.includes("today"), "briefing follow-up");

  const goalsQ = answerMockQuestion(ctx!, "What goals do I have?");
  assert(!!goalsQ.message?.includes("goal"), "mock goals question");

  const oppQ = answerMockQuestion(ctx!, "What is my biggest opportunity?");
  assert(oppQ.cards.length >= 1, "mock opportunity question");

  const queueQ = answerMockQuestion(ctx!, "What is in my queue?");
  assert(
    queueQ.summary.includes("queue") || !!queueQ.message?.includes("queue"),
    "mock queue question",
  );

  const todayQ = answerMockQuestion(ctx!, "What should I do today?");
  assert(todayQ.summary.includes("opportunit"), "mock today question");

  assert(!allowsOutboundExecution("CREATE_CAMPAIGN_DRAFT"), "no-send guarantee");

  console.log("PASS: tAIkOS Phase 5 goals opportunity engine and execution queue");
}

void run();
