import type { TaikosDraftSummary } from "@/lib/taikos/drafts/types";
import type {
  TaikosOpportunity,
  TaikosOpportunityCategory,
  TaikosOpportunitySummary,
} from "@/lib/taikos/opportunities/types";
import type { TaikosQueueSummary } from "@/lib/taikos/queue/types";
import {
  buildUnifiedInviteDraftSummary,
  formatUnifiedInviteDraftDetail,
  type UnifiedInviteDraftSummary,
} from "@/lib/vmb/invites/unified-invite-draft-summary";
import type { InviteSectionId } from "@/lib/vmb/invites/sections";
import { buildVmbInviteSectionHref, buildVmbSalonHref } from "@/lib/vmb/salon-href";
import type { VmbInviteDraft } from "@/types/vmb/invite-draft";

export type TodayCommandCenterInput = {
  hasBook: boolean;
  analysisId?: string;
  /** Best available client count from analysis/context. */
  analyzedClientCount: number;
  opportunitySummary: TaikosOpportunitySummary;
  queueSummary: TaikosQueueSummary;
  taikosDraftSummary: TaikosDraftSummary;
  vmbInviteDrafts: VmbInviteDraft[];
};

export type TodayMoneyOpportunity = {
  opportunityId: string;
  title: string;
  category: TaikosOpportunityCategory;
  estimatedValue: number;
  priority: TaikosOpportunity["priority"];
};

export type TodayCommandCenterSnapshot = {
  bookLoaded: boolean;
  bookStatusLabel: string;
  analyzedClientCount: number;
  totalOpportunities: number;
  highPriorityCount: number;
  topOpportunities: TodayMoneyOpportunity[];
  inviteDraftSummary: UnifiedInviteDraftSummary;
  pendingDraftCount: number;
  queuePendingCount: number;
  nextActionTitle: string;
  nextActionDetail: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  queueCtaHref: string;
  invitesCtaHref: string;
};

const INVITE_SECTION_BY_CATEGORY: Partial<Record<TaikosOpportunityCategory, InviteSectionId>> = {
  "PCN Invite": "private_client_network",
  Referral: "trusted_intro_request",
  Reactivation: "revenue_touch",
  Birthday: "revenue_touch",
  "Revenue Gap": "revenue_touch",
  Retention: "revenue_touch",
};

export function inviteSectionForOpportunityCategory(
  category: TaikosOpportunityCategory,
): InviteSectionId | undefined {
  return INVITE_SECTION_BY_CATEGORY[category];
}

export function topMoneyOpportunities(
  summary: TaikosOpportunitySummary,
  limit = 3,
): TodayMoneyOpportunity[] {
  return [...summary.opportunities]
    .sort((a, b) => b.score - a.score || b.estimatedValue - a.estimatedValue)
    .slice(0, limit)
    .map((opp) => ({
      opportunityId: opp.opportunityId,
      title: opp.title,
      category: opp.category,
      estimatedValue: opp.estimatedValue,
      priority: opp.priority,
    }));
}

export function queuePendingCount(summary: TaikosQueueSummary): number {
  return summary.queuedItems + summary.readyItems;
}

export function buildTodayCommandCenterSnapshot(
  input: TodayCommandCenterInput,
): TodayCommandCenterSnapshot | null {
  if (!input.hasBook) return null;

  const analysisId = input.analysisId?.trim();
  const topOpportunities = topMoneyOpportunities(input.opportunitySummary);
  const inviteDraftSummary = buildUnifiedInviteDraftSummary({
    taikosDraftSummary: input.taikosDraftSummary,
    vmbInviteDrafts: input.vmbInviteDrafts,
    analysisId,
  });
  const pendingDraftCount = inviteDraftSummary.totalOpenDrafts;
  const queueCount = queuePendingCount(input.queueSummary);
  const invitesHref = inviteDraftSummary.canonicalActionHref;
  const queueHref = buildVmbSalonHref("/vmb/queue", analysisId);
  const opportunitiesHref = buildVmbSalonHref("/vmb/opportunities", analysisId);

  let nextActionTitle = "Review opportunities";
  let nextActionDetail = "VMB found relationship moves in your book — pick your first invite.";
  let primaryCtaLabel = "Browse opportunities";
  let primaryCtaHref = opportunitiesHref;

  const topFull =
    input.opportunitySummary.topOpportunity ??
    input.opportunitySummary.opportunities.find(
      (opp) => opp.opportunityId === topOpportunities[0]?.opportunityId,
    ) ??
    null;

  if (pendingDraftCount > 0) {
    nextActionTitle = "Review invite drafts";
    nextActionDetail = formatUnifiedInviteDraftDetail(inviteDraftSummary);
    primaryCtaLabel = "Review invites";
    primaryCtaHref = inviteDraftSummary.canonicalActionHref;
  } else if (queueCount > 0) {
    nextActionTitle = "Work your queue";
    nextActionDetail =
      queueCount === 1
        ? "1 item is queued and waiting for you."
        : `${queueCount} items are queued and waiting for you.`;
    primaryCtaLabel = "Open queue";
    primaryCtaHref = queueHref;
  } else if (topFull) {
    nextActionTitle = "Send your next invite";
    nextActionDetail = topFull.recommendation?.trim() || topFull.title;
    primaryCtaLabel = "Preview invite";
    const section = inviteSectionForOpportunityCategory(topFull.category);
    primaryCtaHref =
      analysisId && section
        ? buildVmbInviteSectionHref(analysisId, section)
        : invitesHref;
  }

  const clientCount = Math.max(0, input.analyzedClientCount);

  return {
    bookLoaded: true,
    bookStatusLabel: clientCount > 0 ? "Book loaded" : "Book connected",
    analyzedClientCount: clientCount,
    totalOpportunities: input.opportunitySummary.totalOpportunities,
    highPriorityCount: input.opportunitySummary.highPriority,
    topOpportunities,
    inviteDraftSummary,
    pendingDraftCount,
    queuePendingCount: queueCount,
    nextActionTitle,
    nextActionDetail,
    primaryCtaLabel,
    primaryCtaHref,
    queueCtaHref: queueHref,
    invitesCtaHref: invitesHref,
  };
}

export function formatTodayMoney(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "$0";
  return `$${Math.round(value).toLocaleString()}`;
}
