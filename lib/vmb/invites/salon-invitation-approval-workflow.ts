import type { InviteTemplateSnapshot } from "@/lib/vmb/invites/invite-template-snapshot";
import { buildAdminDefaultSnapshotFromTemplate } from "@/lib/vmb/invite-templates/admin-default-invitation-package";
import type { SuggestedInvitationRecommendation } from "@/lib/vmb/invites/suggested-invitation-workflow";
import type {
  CreateSalonInvitationApprovalInput,
  SalonInvitationApproval,
} from "@/types/vmb/salon-invitation-approval";

export function cloneInviteTemplateSnapshot(snapshot: InviteTemplateSnapshot): InviteTemplateSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as InviteTemplateSnapshot;
}

export type ApprovalDedupeInput = {
  salonId: string;
  opportunityId?: string;
  clientName: string;
  opportunityType: string;
  sourceCopyId: string;
};

export function buildApprovalDedupeKey(input: ApprovalDedupeInput): string {
  if (input.opportunityId?.trim()) {
    return `${input.salonId}::opp::${input.opportunityId.trim()}::${input.sourceCopyId}`;
  }
  const normalizedClient = input.clientName.trim().toLowerCase();
  return `${input.salonId}::client::${normalizedClient}::${input.opportunityType}::${input.sourceCopyId}`;
}

export function approvalDedupeKey(approval: SalonInvitationApproval): string {
  return buildApprovalDedupeKey({
    salonId: approval.salonId,
    opportunityId: approval.opportunityId,
    clientName: approval.clientName,
    opportunityType: approval.opportunityType,
    sourceCopyId: approval.sourceCopyId,
  });
}

export function approvalDedupeKeyFromRecommendation(
  salonId: string,
  recommendation: SuggestedInvitationRecommendation,
): string | null {
  const sourceCopyId =
    recommendation.publishedCopy?.id ?? `unpublished-${recommendation.templateId}`;
  return buildApprovalDedupeKey({
    salonId,
    opportunityId: recommendation.opportunityId,
    clientName: recommendation.clientName,
    opportunityType: recommendation.categoryLabel,
    sourceCopyId,
  });
}

export function resolveRecommendationPreviewSnapshot(
  recommendation: SuggestedInvitationRecommendation,
  options: { salonName?: string } = {},
): InviteTemplateSnapshot | null {
  if (recommendation.snapshot) return recommendation.snapshot;
  return buildAdminDefaultSnapshotFromTemplate(recommendation.templateId, {
    salonName: options.salonName,
  });
}

export function buildApprovalInputFromRecommendation(
  salonId: string,
  recommendation: SuggestedInvitationRecommendation,
  action: "approve" | "pause",
): CreateSalonInvitationApprovalInput | { error: string } {
  if (action === "approve") {
    if (!recommendation.publishedCopy?.snapshot) {
      return { error: "Suggested invitation requires a published salon template before approval." };
    }

    return {
      clientName: recommendation.clientName,
      opportunityId: recommendation.opportunityId,
      opportunityType: recommendation.categoryLabel,
      sourceCopyId: recommendation.publishedCopy.id,
      sourceTemplateId: recommendation.publishedCopy.sourceTemplateId,
      snapshot: cloneInviteTemplateSnapshot(recommendation.publishedCopy.snapshot),
      reasonText: recommendation.reasonHeadline,
      estimatedValue: recommendation.estimatedValue,
      status: "approved",
    };
  }

  const snapshot = resolveRecommendationPreviewSnapshot(recommendation);
  if (!snapshot) {
    return { error: "Suggested invitation requires a preview snapshot before pausing." };
  }

  const sourceCopyId =
    recommendation.publishedCopy?.id ?? `unpublished-${recommendation.templateId}`;
  const sourceTemplateId =
    recommendation.publishedCopy?.sourceTemplateId ?? recommendation.templateId;

  return {
    clientName: recommendation.clientName,
    opportunityId: recommendation.opportunityId,
    opportunityType: recommendation.categoryLabel,
    sourceCopyId,
    sourceTemplateId,
    snapshot: cloneInviteTemplateSnapshot(snapshot),
    reasonText: recommendation.reasonHeadline,
    estimatedValue: recommendation.estimatedValue,
    status: "paused",
  };
}

export function formatApprovalDate(iso: string | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
