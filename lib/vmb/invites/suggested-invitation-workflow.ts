import { clientNameFromOpportunity } from "@/lib/taikos/workflow/opportunity-display";
import type { TaikosOpportunity, TaikosOpportunityPriority } from "@/lib/taikos/opportunities/types";
import type { VmbCardType } from "@/lib/vmb/cards/card-types";
import {
  expectedTemplateIdForCardType,
  expectedTemplateIdForOpportunity,
  findPublishedCopyForTemplateId,
  indexPublishedCopiesByTemplateId,
  type PublishedCopyMatchSource,
} from "@/lib/vmb/invites/published-copy-matching";
import { getDefaultNailInviteTemplate } from "@/lib/vmb/invite-templates/default-nail-invite-templates";
import {
  resolveAdminDefaultPackageLabels,
} from "@/lib/vmb/invite-templates/admin-default-invitation-package";
import {
  pricingFromSnapshotFields,
  type InvitationPackagePricing,
} from "@/lib/vmb/invites/invitation-package-pricing";
import {
  resolveSnapshotRewardLabels,
  resolveSnapshotServiceLabels,
  type InviteTemplateSnapshot,
} from "@/lib/vmb/invites/invite-template-snapshot";
import type { SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";
import {
  buildOpportunityIntelligence,
  type OpportunityAnalysisContext,
} from "@/lib/vmb/opportunities/opportunity-intelligence";
import {
  filterServiceIdsToActive,
  publishedCopyEligibleForActiveServices,
} from "@/lib/vmb/services/salon-service-lifecycle";
import type { VmbInviteDraft } from "@/types/vmb/invite-draft";

export type SuggestedInvitationCategory =
  | "PCN"
  | "Birthday"
  | "Referral"
  | "VIP"
  | "Refresh"
  | "New Client"
  | "Open Chair"
  | "Reactivation";

export type SuggestedInvitationRecommendation = {
  id: string;
  opportunityId: string;
  clientName: string;
  reasonHeadline: string;
  categoryLabel: SuggestedInvitationCategory;
  suggestedCardType: VmbCardType;
  templateId: string;
  matchNormalizedTemplateId: string;
  matchSource: PublishedCopyMatchSource;
  templateName: string;
  publishedCopy: SalonInviteLocalCopy | null;
  snapshot: InviteTemplateSnapshot | null;
  services: string[];
  rewards: string[];
  expirationLabel?: string;
  estimatedValue: number;
  pricing?: InvitationPackagePricing;
  priority: TaikosOpportunityPriority;
  draftId?: string;
  draftStatus?: VmbInviteDraft["status"];
};

const CATEGORY_LABEL_BY_CARD_TYPE: Record<VmbCardType, SuggestedInvitationCategory> = {
  pcn_invite: "PCN",
  birthday_card: "Birthday",
  referral_invite: "Referral",
  vip_thank_you: "VIP",
  refresh_card: "Refresh",
  service_card: "New Client",
  open_slot_fill: "Open Chair",
  reactivation_card: "Reactivation",
};

const PRIORITY_RANK: Record<TaikosOpportunityPriority, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

function normalizeClientName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function opportunityReasonHeadline(opportunity: TaikosOpportunity): string {
  const rec = opportunity.recommendation.trim();
  const lower = rec.toLowerCase();

  if (opportunity.category === "Birthday" || lower.includes("birthday")) {
    return "Birthday this month";
  }

  if (opportunity.category === "Reactivation" || lower.includes("has not returned") || lower.includes("lapsed")) {
    const daysMatch = rec.match(/(\d+)\s*days?/i);
    return daysMatch ? `Inactive ${daysMatch[1]} days` : "Ready to reconnect";
  }

  if (
    opportunity.category === "Retention" ||
    lower.includes("refresh") ||
    lower.includes("overdue") ||
    lower.includes("normal cycle")
  ) {
    const daysMatch = rec.match(/(\d+)\s*days?/i);
    return daysMatch ? `Due for refresh · ${daysMatch[1]} days` : "Due for refresh";
  }

  if (opportunity.category === "PCN Invite") {
    return "Private client invite candidate";
  }

  if (opportunity.category === "Referral" || lower.includes("referral")) {
    return "Referral opportunity";
  }

  if (opportunity.category === "Open Slot" || lower.includes("open slot") || lower.includes("calendar gap")) {
    return "Open chair available";
  }

  if (lower.includes("new client") || lower.includes("first visit")) {
    return "New client welcome";
  }

  if (lower.includes("vip") || lower.includes("high value")) {
    return "VIP relationship";
  }

  if (opportunity.title.trim()) {
    return opportunity.title.trim();
  }

  return rec.length > 72 ? `${rec.slice(0, 69)}…` : rec;
}

export function defaultTemplateNameForCardType(cardType: VmbCardType): string {
  const templateId = expectedTemplateIdForCardType(cardType);
  return getDefaultNailInviteTemplate(templateId)?.displayName ?? templateId;
}

/** @deprecated Prefer indexPublishedCopiesByTemplateId from published-copy-matching. */
export function publishedCopyByTemplateId(
  copies: SalonInviteLocalCopy[],
): Map<string, SalonInviteLocalCopy> {
  return indexPublishedCopiesByTemplateId(copies);
}

function findMatchingDraft(
  drafts: VmbInviteDraft[],
  clientName: string,
): VmbInviteDraft | undefined {
  const normalized = normalizeClientName(clientName);
  return drafts.find((draft) => normalizeClientName(draft.clientName) === normalized);
}

function isActionableDraft(draft: VmbInviteDraft | undefined): boolean {
  if (!draft) return true;
  return draft.status === "draft";
}

export function buildSuggestedInvitationsFromOpportunities(
  opportunities: TaikosOpportunity[],
  publishedCopies: SalonInviteLocalCopy[],
  options: {
    analysisContext?: OpportunityAnalysisContext;
    drafts?: VmbInviteDraft[];
    activeServiceIds?: ReadonlySet<string>;
  } = {},
): SuggestedInvitationRecommendation[] {
  const drafts = options.drafts ?? [];
  const context = options.analysisContext ?? {};
  const activeServiceIds = options.activeServiceIds;

  const rows: SuggestedInvitationRecommendation[] = [];

  for (const opportunity of opportunities) {
    const intelligence = buildOpportunityIntelligence(opportunity, context);
    const clientName = intelligence.subjectName ?? clientNameFromOpportunity(opportunity);
    const draft = findMatchingDraft(drafts, clientName);
    if (!isActionableDraft(draft)) continue;

    const suggestedCardType = intelligence.suggestedCardType;
    const templateId = expectedTemplateIdForOpportunity(opportunity, suggestedCardType);
    const match = findPublishedCopyForTemplateId(publishedCopies, templateId);
    const publishedCopy = match.copy;
    if (
      publishedCopy &&
      activeServiceIds &&
      !publishedCopyEligibleForActiveServices(publishedCopy.snapshot.serviceIds, activeServiceIds)
    ) {
      continue;
    }
    const snapshot = publishedCopy?.snapshot ?? null;
    const templateName = snapshot?.templateName ?? defaultTemplateNameForCardType(suggestedCardType);
    const adminLabels = resolveAdminDefaultPackageLabels(templateId);
    const snapshotPricing = snapshot ? pricingFromSnapshotFields(snapshot) : null;
    const pricing = snapshotPricing ?? adminLabels.pricing;
    const activeSnapshotServiceIds = snapshot
      ? filterServiceIdsToActive(snapshot.serviceIds, activeServiceIds ?? new Set())
      : [];

    rows.push({
      id: opportunity.opportunityId,
      opportunityId: opportunity.opportunityId,
      clientName,
      reasonHeadline: opportunityReasonHeadline(opportunity),
      categoryLabel: CATEGORY_LABEL_BY_CARD_TYPE[suggestedCardType],
      suggestedCardType,
      templateId,
      matchNormalizedTemplateId: match.normalizedExpectedTemplateId,
      matchSource: match.matchSource,
      templateName,
      publishedCopy,
      snapshot,
      services: snapshot
        ? resolveSnapshotServiceLabels({
            ...snapshot,
            serviceIds:
              activeServiceIds && snapshot.serviceIds.length > 0
                ? activeSnapshotServiceIds
                : snapshot.serviceIds,
          })
        : adminLabels.services,
      rewards: snapshot ? resolveSnapshotRewardLabels(snapshot) : adminLabels.rewards,
      expirationLabel: snapshot?.expirationLabel ?? adminLabels.expirationLabel,
      estimatedValue: pricing?.offerPrice ?? opportunity.estimatedValue,
      pricing,
      priority: opportunity.priority,
      draftId: draft?.draftId,
      draftStatus: draft?.status,
    });
  }

  const dedupedRows = rows.filter((row, index, allRows) => {
    const key = [
      row.templateId,
      normalizeClientName(row.clientName),
      row.reasonHeadline.trim().toLowerCase(),
      row.pricing?.priceLabel ?? "",
    ].join("|");
    return (
      allRows.findIndex((candidate) => [
        candidate.templateId,
        normalizeClientName(candidate.clientName),
        candidate.reasonHeadline.trim().toLowerCase(),
        candidate.pricing?.priceLabel ?? "",
      ].join("|") === key) === index
    );
  });

  return dedupedRows.sort((a, b) => {
    const priorityDelta = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDelta !== 0) return priorityDelta;
    return b.estimatedValue - a.estimatedValue;
  });
}
