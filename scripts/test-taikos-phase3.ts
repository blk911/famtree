/**
 * npm run test:taikos:phase3
 */
import { confirmTaikosAction, previewTaikosAction } from "../lib/taikos/actions/action-dispatcher";
import {
  contractAction,
  mapLegacyActionId,
  resolveContractType,
} from "../lib/taikos/actions/action-registry";
import {
  afterConfirmMessage,
  allowsOutboundExecution,
  requiresConfirmation,
} from "../lib/taikos/actions/confirm-gates";
import { listActionLogForSalon } from "../lib/taikos/actions/action-log-store";
import { buildAiosContextPacket } from "../lib/taikos/context/context-builder";
import { resolvePageContext } from "../lib/taikos/context/page-registry";
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
  const networkPage = resolvePageContext("/vmb/network");
  const pcnAction = networkPage.availableActions[0];
  assert(pcnAction.kind === "contract", "network action is contract");
  assert(resolveContractType(pcnAction) === "CONTINUE_PCN_INVITES", "continue PCN mapping");

  const campaignPage = resolvePageContext("/vmb/history");
  assert(
    resolveContractType(campaignPage.availableActions[0]) === "CREATE_CAMPAIGN_DRAFT",
    "build campaign mapping",
  );

  const offersPage = resolvePageContext("/vmb/offers");
  assert(
    resolveContractType(offersPage.availableActions[0]) === "CREATE_SERVICE_CARD_DRAFT",
    "service card mapping",
  );

  assert(mapLegacyActionId("continue-pcn") === "CONTINUE_PCN_INVITES", "legacy id map");
  assert(
    resolveContractType(contractAction("x", "CREATE_INVITE_DRAFT")) === "CREATE_INVITE_DRAFT",
    "contract action type",
  );

  assert(requiresConfirmation("CONTINUE_PCN_INVITES"), "PCN requires confirm");
  assert(requiresConfirmation("VIEW_CLIENT_SEGMENT"), "segment requires confirm");
  assert(!allowsOutboundExecution("CREATE_CAMPAIGN_DRAFT"), "no outbound execution");
  assert(afterConfirmMessage() === "Recorded. No message sent yet.", "no-send message");

  const trial = await createVmbTrialLead({
    salonName: "Phase3 Salon",
    ownerName: "Jenny",
    email: `taikos-p3-${Date.now()}@salon.test`,
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
    pathname: "/vmb/network",
    recordLogin: false,
  });
  assert(!!ctx, "context packet");
  assert(ctx!.hasRealBookData, "real book for drafts");

  const pcnPreview = previewTaikosAction("CONTINUE_PCN_INVITES", ctx!);
  assert(pcnPreview.noSendGuarantee === true, "no send guarantee");
  assert(pcnPreview.deliverable.type === "invite", "PCN invite deliverable");
  assert(
    pcnPreview.deliverable.title === "Private Client Network Invitation",
    "PCN invite title",
  );
  assert(
    pcnPreview.deliverable.type === "invite" &&
      pcnPreview.deliverable.suggestedClients.length > 0,
    "real client names",
  );
  const expectedNames = ctx!.contactCandidates.slice(0, 5).map((c) => c.clientName);
  assert(
    pcnPreview.deliverable.type === "invite" &&
      pcnPreview.deliverable.suggestedClients[0] === expectedNames[0],
    "invite draft uses book contact candidates",
  );

  const campaignPreview = previewTaikosAction("CREATE_CAMPAIGN_DRAFT", ctx!);
  assert(campaignPreview.deliverable.type === "campaign", "campaign deliverable");

  const servicePreview = previewTaikosAction("CREATE_SERVICE_CARD_DRAFT", ctx!, {
    serviceName: "Gel Fill + Design",
  });
  assert(servicePreview.deliverable.type === "service_card", "service card deliverable");
  assert(
    (servicePreview.deliverable as { serviceName: string }).serviceName.length > 0,
    "service name",
  );

  const segmentPreview = previewTaikosAction("VIEW_CLIENT_SEGMENT", ctx!);
  assert(segmentPreview.deliverable.type === "client_segment", "segment deliverable");

  const reactivationPreview = previewTaikosAction("PREVIEW_REACTIVATION_MESSAGE", ctx!);
  assert(reactivationPreview.deliverable.type === "reactivation", "reactivation deliverable");
  assert(
    (reactivationPreview.deliverable as { client: string }).client.length > 0,
    "reactivation client",
  );

  const confirm = await confirmTaikosAction("CONTINUE_PCN_INVITES", ctx!, {
    previewId: pcnPreview.previewId,
    sourcePage: "/vmb/network",
    sourceRecommendationId: "continue-pcn",
  });
  assert(confirm.ok, "confirm ok");
  assert(
    confirm.message === "Recorded. Draft saved. No message sent yet.",
    "confirm saves draft message",
  );
  assert(!!confirm.draftId, "confirm creates persisted draft");
  assert(confirm.logEntry.status === "confirmed", "log status confirmed");
  assert(confirm.logEntry.salonId === trialId, "log salon id");

  const logs = await listActionLogForSalon(trialId, 10);
  assert(logs.length >= 1, "action log read");
  assert(logs[0].actionType === "CONTINUE_PCN_INVITES", "log action type");

  console.log("PASS: tAIkOS Phase 3 action contract and deliverable surface");
}

void run();
