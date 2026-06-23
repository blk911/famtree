/**
 * npm run test:vmb:today-command-center
 */
import fs from "node:fs";
import path from "node:path";
import type { TaikosDraftSummary } from "../lib/taikos/drafts/types";
import type { TaikosOpportunitySummary } from "../lib/taikos/opportunities/types";
import type { TaikosQueueSummary } from "../lib/taikos/queue/types";
import {
  buildUnifiedInviteDraftSummary,
  countTaikosOpenInviteDrafts,
  countVmbOpenInviteDrafts,
} from "../lib/vmb/invites/unified-invite-draft-summary";
import {
  buildTodayCommandCenterSnapshot,
  queuePendingCount,
  topMoneyOpportunities,
} from "../lib/vmb/today-command-center";
import type { VmbInviteDraft } from "../types/vmb/invite-draft";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

const EMPTY_DRAFTS: TaikosDraftSummary = {
  totalDrafts: 0,
  openDrafts: 0,
  draftsByType: {},
  recentDrafts: [],
};

const EMPTY_QUEUE: TaikosQueueSummary = {
  totalItems: 0,
  queuedItems: 0,
  readyItems: 0,
  blockedItems: 0,
  completedItems: 0,
  recentItems: [],
  allItems: [],
};

function oppSummary(
  overrides: Partial<TaikosOpportunitySummary> = {},
): TaikosOpportunitySummary {
  return {
    totalOpportunities: 0,
    highPriority: 0,
    topOpportunity: null,
    opportunities: [],
    ...overrides,
  };
}

function vmbDraft(status: VmbInviteDraft["status"], id: string): VmbInviteDraft {
  return {
    draftId: id,
    trialId: "trial-1",
    analysisId: "analysis-abc",
    clientName: "Grace",
    reasonSelected: "Top client",
    inviteCategory: "private_client_network",
    potentialValue: 100,
    status,
    subject: "Invite",
    editableMessage: "Hello",
    lockedFooter: "Footer",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function commandCenterInput(
  overrides: Partial<{
    taikosDraftSummary: TaikosDraftSummary;
    vmbInviteDrafts: VmbInviteDraft[];
    queueSummary: TaikosQueueSummary;
    opportunitySummary: TaikosOpportunitySummary;
  }> = {},
) {
  return {
    hasBook: true,
    analysisId: "analysis-abc",
    analyzedClientCount: 40,
    opportunitySummary: oppSummary(),
    queueSummary: EMPTY_QUEUE,
    taikosDraftSummary: EMPTY_DRAFTS,
    vmbInviteDrafts: [],
    ...overrides,
  };
}

function run(): void {
  const todaySource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/VmbTodayClient.tsx"),
    "utf8",
  );
  assert(todaySource.includes("LoadYourBookCta"), "empty Today state keeps Load your book CTA");
  assert(todaySource.includes("TodayCommandCenter"), "loaded Today state renders command center");
  assert(todaySource.includes("/api/vmb/invite-drafts"), "Today loads VMB invite drafts for unified summary");

  const composerSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/today/SalonInviteComposer.tsx"),
    "utf8",
  );
  const commandCenterSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/today/TodayCommandCenter.tsx"),
    "utf8",
  );
  const offerRevisionSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/today/InviteOfferRevisionPanel.tsx"),
    "utf8",
  );
  assert(
    composerSource.includes('selectedReason === "new-client"') && composerSource.includes("Quick add"),
    "new member touchpoint bypasses the matching-client search",
  );
  assert(
    commandCenterSource.includes('const isNewMemberInvite = selectedReason === "new-client"'),
    "command center owns a dedicated new member branch",
  );
  assert(
    commandCenterSource.includes("Confirm My Style and send")
      && commandCenterSource.includes("selectedAddonIds")
      && commandCenterSource.includes("InviteOfferRevisionPanel"),
    "new member branch reviews and revises the salon offer",
  );
  assert(
    offerRevisionSource.includes("toggleAddon")
      && offerRevisionSource.includes("Use this offer")
      && offerRevisionSource.includes(">Cancel<")
      && commandCenterSource.includes("onUse={useOfferRevision}"),
    "offer revision uses a temporary multi-add-on draft with commit and cancel actions",
  );
  assert(
    commandCenterSource.includes('fetch("/api/vmb/salon-services"')
      && commandCenterSource.includes('fetch("/api/vmb/salon-invites"'),
    "new member My Style loads salon-facing services and published invitations",
  );
  assert(
    commandCenterSource.includes("/api/vmb/salon-invites/sync"),
    "Today recovers missing salon invite inventory from saved Admin Library templates",
  );
  assert(
    commandCenterSource.includes("inviteTemplateIdForSalonReason")
      && commandCenterSource.includes("findPublishedCopyForTemplateId")
      && commandCenterSource.includes("enabledSalonAddonIds")
      && !commandCenterSource.includes("approvedAddonIds"),
    "Today resolves the approved salon invite type and uses current salon service add-ons",
  );
  assert(
    commandCenterSource.includes('fetch("/api/vmb/salon-invitation-approvals"')
      && commandCenterSource.includes('fetch("/api/vmb/sent-invites"')
      && !commandCenterSource.includes('fetch("/api/vmb/invite-events"')
      && !commandCenterSource.includes("saveInviteStub")
      && !commandCenterSource.includes("Send invite (stub)"),
    "Today sends every invite type through approval and canonical SentInvite endpoints",
  );
  assert(
    commandCenterSource.includes("SalonInviteCard")
      && commandCenterSource.includes("Open my birthday gift")
      && !commandCenterSource.includes("vmb-today-preview-modal__card"),
    "Today preview modal uses the canonical salon invite renderer with gift CTA language",
  );
  const sentInviteRouteSource = fs.readFileSync(
    path.join(process.cwd(), "app/api/vmb/sent-invites/route.ts"),
    "utf8",
  );
  assert(
    sentInviteRouteSource.includes("sendVmbOfferInviteEmail")
      && sentInviteRouteSource.includes("deliveryStatus"),
    "canonical SentInvite route dispatches recipient email after persistence",
  );

  assert(
    buildTodayCommandCenterSnapshot({
      hasBook: false,
      analyzedClientCount: 0,
      opportunitySummary: oppSummary(),
      queueSummary: EMPTY_QUEUE,
      taikosDraftSummary: EMPTY_DRAFTS,
      vmbInviteDrafts: [],
    }) === null,
    "no snapshot without book",
  );

  const onlyTaikos = buildUnifiedInviteDraftSummary({
    taikosDraftSummary: {
      ...EMPTY_DRAFTS,
      openDrafts: 2,
      draftsByType: { pcn_invite: 2 },
    },
    vmbInviteDrafts: [],
    analysisId: "analysis-abc",
  });
  assert(onlyTaikos.taikosDraftCount === 2, "only tAIkOS drafts counted");
  assert(onlyTaikos.vmbDraftCount === 0, "no VMB drafts");
  assert(onlyTaikos.totalOpenDrafts === 2, "total reflects tAIkOS only");
  assert(onlyTaikos.nextDraftSource === "taikos", "next source is tAIkOS when only tAIkOS drafts");

  const onlyVmb = buildUnifiedInviteDraftSummary({
    taikosDraftSummary: EMPTY_DRAFTS,
    vmbInviteDrafts: [vmbDraft("draft", "vmb-1"), vmbDraft("approved", "vmb-2")],
    analysisId: "analysis-abc",
  });
  assert(onlyVmb.vmbDraftCount === 2, "only VMB drafts counted");
  assert(onlyVmb.taikosDraftCount === 0, "no tAIkOS invite drafts");
  assert(onlyVmb.totalOpenDrafts === 2, "total reflects VMB only");
  assert(onlyVmb.nextDraftSource === "vmb", "next source is VMB when VMB drafts exist");

  const both = buildUnifiedInviteDraftSummary({
    taikosDraftSummary: {
      ...EMPTY_DRAFTS,
      draftsByType: { referral_ask: 1 },
    },
    vmbInviteDrafts: [vmbDraft("draft", "vmb-1")],
    analysisId: "analysis-abc",
  });
  assert(both.totalOpenDrafts === 2, "both stores summed");
  assert(both.taikosDraftCount === 1 && both.vmbDraftCount === 1, "both store counts exposed");
  assert(both.nextDraftSource === "vmb", "VMB takes priority for next draft source");

  const none = buildUnifiedInviteDraftSummary({
    taikosDraftSummary: { ...EMPTY_DRAFTS, draftsByType: { campaign: 2 } },
    vmbInviteDrafts: [vmbDraft("sent", "vmb-sent"), vmbDraft("skipped", "vmb-skip")],
    analysisId: "analysis-abc",
  });
  assert(none.totalOpenDrafts === 0, "no open invite drafts when only non-invite/c closed rows");
  assert(none.sentCount >= 1, "sent count available from VMB drafts");
  assert(none.nextDraftSource === null, "no next draft source when none open");

  assert(
    onlyVmb.canonicalActionHref === "/vmb/invites?analysis=analysis-abc",
    "canonical CTA href targets invites with analysis",
  );

  const loaded = buildTodayCommandCenterSnapshot(
    commandCenterInput({
      opportunitySummary: oppSummary({
        totalOpportunities: 5,
        highPriority: 2,
        topOpportunity: {
          opportunityId: "opp-1",
          title: "Invite Grace to PCN",
          category: "PCN Invite",
          estimatedValue: 420,
          confidence: 0.9,
          recommendation: "Grace is a top referrer candidate.",
          suggestedAction: "CREATE_INVITE_DRAFT",
          priority: "High",
          score: 99,
        },
        opportunities: [
          {
            opportunityId: "opp-2",
            title: "Reactivate Maya",
            category: "Reactivation",
            estimatedValue: 180,
            confidence: 0.7,
            recommendation: "Maya has not booked in 90 days.",
            suggestedAction: "PREVIEW_REACTIVATION_MESSAGE",
            priority: "Medium",
            score: 70,
          },
          {
            opportunityId: "opp-1",
            title: "Invite Grace to PCN",
            category: "PCN Invite",
            estimatedValue: 420,
            confidence: 0.9,
            recommendation: "Grace is a top referrer candidate.",
            suggestedAction: "CREATE_INVITE_DRAFT",
            priority: "High",
            score: 99,
          },
          {
            opportunityId: "opp-3",
            title: "Birthday touch for Kim",
            category: "Birthday",
            estimatedValue: 95,
            confidence: 0.6,
            recommendation: "Kim's birthday is this week.",
            suggestedAction: "CREATE_INVITE_DRAFT",
            priority: "Medium",
            score: 55,
          },
        ],
      }),
    }),
  );
  assert(loaded !== null, "loaded Today produces command center snapshot");
  if (!loaded) return;

  assert(loaded.bookLoaded, "book loaded flag set");
  assert(loaded.topOpportunities[0]?.opportunityId === "opp-1", "opportunities ranked by score");
  assert(loaded.primaryCtaHref.includes("/vmb/invites"), "next invite action links to invites");

  const bothPending = buildTodayCommandCenterSnapshot(
    commandCenterInput({
      queueSummary: { ...EMPTY_QUEUE, queuedItems: 2, readyItems: 1 },
      taikosDraftSummary: { ...EMPTY_DRAFTS, draftsByType: { pcn_invite: 1 } },
      vmbInviteDrafts: [vmbDraft("draft", "vmb-1")],
    }),
  );
  assert(bothPending?.inviteDraftSummary.totalOpenDrafts === 2, "command center uses unified draft total");
  assert(Boolean(bothPending?.primaryCtaHref.includes("/vmb/invites")), "drafts take priority over queue");
  assert(
    bothPending?.primaryCtaHref === bothPending?.inviteDraftSummary.canonicalActionHref,
    "primary CTA uses canonical unified href",
  );

  const queueOnly = buildTodayCommandCenterSnapshot(
    commandCenterInput({
      queueSummary: { ...EMPTY_QUEUE, queuedItems: 2, readyItems: 0 },
    }),
  );
  assert(Boolean(queueOnly?.primaryCtaHref.includes("/vmb/queue")), "queue primary when no drafts");
  assert(queuePendingCount({ ...EMPTY_QUEUE, queuedItems: 2, readyItems: 1 }) === 3, "queue pending count");
  assert(countTaikosOpenInviteDrafts({ ...EMPTY_DRAFTS, draftsByType: { pcn_invite: 1, campaign: 4 } }) === 1, "taikos count ignores non-invite types");
  assert(countVmbOpenInviteDrafts([vmbDraft("draft", "a"), vmbDraft("sent", "b")]) === 1, "vmb count ignores sent");

  const top = topMoneyOpportunities(
    oppSummary({
      opportunities: [
        {
          opportunityId: "low",
          title: "Low",
          category: "Campaign",
          estimatedValue: 10,
          confidence: 0.5,
          recommendation: "",
          suggestedAction: "CREATE_CAMPAIGN_DRAFT",
          priority: "Low",
          score: 1,
        },
        {
          opportunityId: "high",
          title: "High",
          category: "PCN Invite",
          estimatedValue: 500,
          confidence: 0.9,
          recommendation: "",
          suggestedAction: "CREATE_INVITE_DRAFT",
          priority: "High",
          score: 90,
        },
      ],
    }),
    1,
  );
  assert(top[0]?.opportunityId === "high", "top opportunities sorted by score");

  console.log("OK: VMB today command center tests passed");
}

run();
