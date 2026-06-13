/**
 * npm run test:vmb:invite-card-queue-persistence
 */
import { confirmTaikosAction } from "../lib/taikos/actions/action-dispatcher";
import { buildAiosContextPacket } from "../lib/taikos/context/context-builder";
import { getDraftById } from "../lib/taikos/drafts/draft-store";
import { enqueueDraft } from "../lib/taikos/queue/queue-builder";
import { listAllQueueItems } from "../lib/taikos/queue/queue-store";
import { buildCardPreview } from "../lib/vmb/cards/card-template-engine";
import {
  cardPreviewToQueuedInvitePayload,
  parseQueuedInviteCardPayload,
} from "../lib/vmb/cards/queued-invite-card-payload";
import { VMB_SAMPLE_BOOK_TEXT } from "../lib/vmb/sample-book";
import { runVmbBookAnalysis } from "../lib/vmb/run-book-analysis";
import { createVmbTrialLead } from "../lib/vmb/trial-store";
import { upsertWorkspaceForTrial } from "../lib/vmb/workspace-store";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function run(): Promise<void> {
  const trial = await createVmbTrialLead({
    salonName: "Invite Queue Salon",
    ownerName: "Jenny",
    email: `invite-queue-${Date.now()}@salon.test`,
    providerPlatform: "glossgenius",
  });
  if ("error" in trial) process.exit(1);
  const trialId = trial.lead.id;

  await upsertWorkspaceForTrial({
    trialId,
    salonName: trial.lead.salonName,
    ownerName: trial.lead.ownerName,
    email: trial.lead.email,
    providerPlatform: "glossgenius",
  });

  const analyzed = await runVmbBookAnalysis({
    trialId,
    salonName: trial.lead.salonName,
    providerPlatform: "glossgenius",
    rawText: VMB_SAMPLE_BOOK_TEXT,
    sourceType: "sample",
  });
  assert(analyzed.ok, "ingest sample book");
  if (!analyzed.ok) process.exit(1);

  const ctx = await buildAiosContextPacket({
    trialId,
    pathname: "/vmb/today",
    analysisId: analyzed.data.analysis.analysisId,
    recordLogin: false,
  });
  assert(!!ctx, "context packet");

  const cardPreview = buildCardPreview({
    cardType: "pcn_invite",
    recipientName: "Grace",
    salonName: trial.lead.salonName,
    techName: "Jenny",
    visitCount: 4,
  });
  cardPreview.inviteCopy = {
    ...(cardPreview.inviteCopy ?? {
      greeting: "Dear Grace,",
      personalConnection: "",
      inviteMessage: "",
      offerMessage: "",
      signature: "Jenny ❤️",
      primaryCta: "Join My Private Client Network",
      secondaryCta: "Book My Next Appointment",
    }),
    personalConnection: "Edited personal connection for Grace.",
    inviteMessage: "Edited invite message for the Private Client Network.",
  };

  const inviteCard = cardPreviewToQueuedInvitePayload(
    cardPreview,
    "Grace",
    "Private Client Invite",
  );
  assert(
    Boolean(inviteCard.personalConnection?.includes("Edited personal")),
    "edited invite payload built",
  );

  const confirmed = await confirmTaikosAction("CONTINUE_PCN_INVITES", ctx!, {
    previewId: `preview-test-${Date.now()}`,
    sourcePage: "/vmb/today",
    sourceRecommendationId: "opp-test-grace",
    inviteCard,
  });
  assert(!!confirmed.draftId, "approve created draft");
  const draftId = confirmed.draftId!;

  const draft = await getDraftById(trialId, draftId);
  assert(!!draft, "draft persisted");
  const fromDraft = parseQueuedInviteCardPayload(draft!.payload);
  assert(!!fromDraft, "draft payload contains inviteCard");
  assert(
    fromDraft!.personalConnection === inviteCard.personalConnection,
    "draft stores edited personalConnection",
  );
  assert(fromDraft!.inviteMessage === inviteCard.inviteMessage, "draft stores edited inviteMessage");

  const queued = await enqueueDraft(trialId, ctx!.operatorId, draftId, ctx!.goalSummary.goals);
  assert(!("error" in queued), "queue enqueue succeeded");
  if ("error" in queued) process.exit(1);

  assert(!!queued.item.inviteCard, "queue item snapshot contains inviteCard");
  assert(
    queued.item.inviteCard!.personalConnection === inviteCard.personalConnection,
    "queue item preserves edited personalConnection",
  );

  const reloaded = await listAllQueueItems(trialId);
  const persisted = reloaded.find((item) => item.queueId === queued.item.queueId);
  assert(!!persisted, "queue item reloads after write");
  assert(
    persisted!.inviteCard?.greeting === inviteCard.greeting,
    "queue item still contains edited greeting after reload",
  );

  console.log("OK: invite card copy persists through approve and queue");
}

void run();
