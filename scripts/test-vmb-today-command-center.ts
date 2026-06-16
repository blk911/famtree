/**
 * npm run test:vmb:today-command-center
 */
import fs from "node:fs";
import path from "node:path";
import type { TaikosDraftSummary } from "../lib/taikos/drafts/types";
import type { TaikosOpportunitySummary } from "../lib/taikos/opportunities/types";
import type { TaikosQueueSummary } from "../lib/taikos/queue/types";
import {
  buildTodayCommandCenterSnapshot,
  queuePendingCount,
  topMoneyOpportunities,
} from "../lib/vmb/today-command-center";

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

function run(): void {
  const todaySource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/VmbTodayClient.tsx"),
    "utf8",
  );
  assert(todaySource.includes("LoadYourBookCta"), "empty Today state keeps Load your book CTA");
  assert(todaySource.includes("TodayCommandCenter"), "loaded Today state renders command center");

  assert(buildTodayCommandCenterSnapshot({
    hasBook: false,
    analyzedClientCount: 0,
    opportunitySummary: oppSummary(),
    queueSummary: EMPTY_QUEUE,
    draftSummary: EMPTY_DRAFTS,
  }) === null, "no snapshot without book");

  const loaded = buildTodayCommandCenterSnapshot({
    hasBook: true,
    analysisId: "analysis-abc",
    analyzedClientCount: 128,
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
    queueSummary: { ...EMPTY_QUEUE, queuedItems: 0, readyItems: 0 },
    draftSummary: EMPTY_DRAFTS,
  });
  assert(loaded !== null, "loaded Today produces command center snapshot");
  if (!loaded) return;

  assert(loaded.bookLoaded, "book loaded flag set");
  assert(loaded.analyzedClientCount === 128, "client count surfaced");
  assert(loaded.topOpportunities.length === 3, "top 3 money opportunities shown");
  assert(loaded.topOpportunities[0]?.opportunityId === "opp-1", "opportunities ranked by score");
  assert(loaded.nextActionTitle.length > 0, "visible next action title");
  assert(loaded.primaryCtaHref.includes("/vmb/invites"), "next invite action links to invites");
  assert(loaded.primaryCtaHref.includes("analysis=analysis-abc"), "primary action preserves analysis");
  assert(loaded.queueCtaHref.includes("/vmb/queue?analysis=analysis-abc"), "queue link resolves with analysis");

  const draftsPending = buildTodayCommandCenterSnapshot({
    hasBook: true,
    analysisId: "analysis-abc",
    analyzedClientCount: 40,
    opportunitySummary: oppSummary({ totalOpportunities: 1 }),
    queueSummary: { ...EMPTY_QUEUE, queuedItems: 2, readyItems: 1 },
    draftSummary: { ...EMPTY_DRAFTS, openDrafts: 3 },
  });
  assert(Boolean(draftsPending?.primaryCtaHref.includes("/vmb/invites")), "drafts take priority over queue");
  assert(draftsPending?.primaryCtaLabel === "Review invites", "drafts primary label");

  const queueOnly = buildTodayCommandCenterSnapshot({
    hasBook: true,
    analysisId: "analysis-abc",
    analyzedClientCount: 40,
    opportunitySummary: oppSummary(),
    queueSummary: { ...EMPTY_QUEUE, queuedItems: 2, readyItems: 0 },
    draftSummary: EMPTY_DRAFTS,
  });
  assert(Boolean(queueOnly?.primaryCtaHref.includes("/vmb/queue")), "queue primary when no drafts");
  assert(queuePendingCount({ ...EMPTY_QUEUE, queuedItems: 2, readyItems: 1 }) === 3, "queue pending count");

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
