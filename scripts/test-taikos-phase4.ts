/**
 * npm run test:taikos:phase4
 */
import { confirmTaikosAction, previewTaikosAction } from "../lib/taikos/actions/action-dispatcher";
import { allowsOutboundExecution } from "../lib/taikos/actions/confirm-gates";
import { buildAiosContextPacket } from "../lib/taikos/context/context-builder";
import { draftBriefingLine } from "../lib/taikos/context/draft-context";
import { buildMorningBriefing } from "../lib/taikos/orchestrator/morning-briefing";
import {
  archiveDraft,
  createDraft,
  getDraftById,
  listDrafts,
  summarizeDraftsForSalon,
  updateDraft,
} from "../lib/taikos/drafts/draft-store";
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
    salonName: "Phase4 Salon",
    ownerName: "Jenny",
    email: `taikos-p4-${Date.now()}@salon.test`,
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

  const created = await createDraft({
    salonId: trialId,
    operatorId: "jenny@test",
    sourcePage: "/vmb/network",
    draftType: "pcn_invite",
    title: "Test PCN Invite",
    status: "draft",
    payload: { message: "Hi Taylor — welcome to the network." },
    estimatedValue: 120,
    audit: {},
  });
  assert(!!created.draftId, "createDraft returns id");

  const listed = await listDrafts({ salonId: trialId, type: "pcn_invite" });
  assert(listed.length >= 1, "listDrafts");

  const fetched = await getDraftById(trialId, created.draftId);
  assert(fetched?.title === "Test PCN Invite", "getDraftById");

  const updated = await updateDraft(trialId, created.draftId, {
    title: "Updated PCN Invite",
    status: "reviewed",
    payload: { message: "Updated message" },
  });
  assert(updated?.status === "reviewed", "updateDraft status");
  assert(updated?.title === "Updated PCN Invite", "updateDraft title");

  const archived = await archiveDraft(trialId, created.draftId);
  assert(archived?.status === "archived", "archiveDraft");

  const ctx = await buildAiosContextPacket({
    trialId,
    pathname: "/vmb/invites",
    recordLogin: false,
  });
  assert(!!ctx, "context");
  assert(typeof ctx!.draftSummary.totalDrafts === "number", "draftSummary on context");
  assert(ctx!.draftSummary.totalDrafts >= 1, "draft count in context");

  const briefing = buildMorningBriefing(ctx!);
  if (ctx!.draftSummary.openDrafts > 0) {
    assert(
      briefing.summary.includes("saved draft") || briefing.summary.includes("draft"),
      "briefing mentions drafts when open",
    );
  }

  const draftLine = draftBriefingLine(ctx!.draftSummary);
  assert(draftLine === null || draftLine.includes("saved draft"), "draft briefing line");

  const ctx2 = await buildAiosContextPacket({
    trialId,
    pathname: "/vmb/network",
    recordLogin: false,
  });
  const preview = previewTaikosAction("CONTINUE_PCN_INVITES", ctx2!);
  const confirm = await confirmTaikosAction("CONTINUE_PCN_INVITES", ctx2!, {
    previewId: preview.previewId,
    sourcePage: "/vmb/network",
    sourceRecommendationId: "continue-pcn",
  });
  assert(confirm.ok, "confirm ok");
  assert(!!confirm.draftId, "confirm creates draft");
  assert(!!confirm.draftHref?.includes("/vmb/invites"), "draft href invites");
  assert(
    confirm.message === "Recorded. Draft saved. No message sent yet.",
    "draft saved message",
  );

  const persisted = await getDraftById(trialId, confirm.draftId!);
  assert(!!persisted, "persisted draft readable");
  assert(persisted!.draftType === "pcn_invite", "persisted draft type");

  const summary = await summarizeDraftsForSalon(trialId);
  assert(summary.recentDrafts.length >= 1, "summarize drafts");

  assert(!allowsOutboundExecution("CREATE_CAMPAIGN_DRAFT"), "no-send guarantee");

  console.log("PASS: tAIkOS Phase 4 persisted draft workspace");
}

void run();
