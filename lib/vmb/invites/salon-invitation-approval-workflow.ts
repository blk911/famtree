import type { InviteTemplateSnapshot } from "@/lib/vmb/invites/invite-template-snapshot";
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
  if (!recommendation.publishedCopy) return null;
  return buildApprovalDedupeKey({
    salonId,
    opportunityId: recommendation.opportunityId,
    clientName: recommendation.clientName,
    opportunityType: recommendation.categoryLabel,
    sourceCopyId: recommendation.publishedCopy.id,
  });
}

export function buildApprovalInputFromRecommendation(
  salonId: string,
  recommendation: SuggestedInvitationRecommendation,
  action: "approve" | "pause",
): CreateSalonInvitationApprovalInput | { error: string } {
  if (!recommendation.publishedCopy?.snapshot) {
    return { error: "Suggested invitation requires a published salon template before approval." };
  }

  const status: CreateSalonInvitationApprovalInput["status"] =
    action === "approve" ? "approved" : "paused";

  return {
    clientName: recommendation.clientName,
    opportunityId: recommendation.opportunityId,
    opportunityType: recommendation.categoryLabel,
    sourceCopyId: recommendation.publishedCopy.id,
    sourceTemplateId: recommendation.publishedCopy.sourceTemplateId,
    snapshot: cloneInviteTemplateSnapshot(recommendation.publishedCopy.snapshot),
    reasonText: recommendation.reasonHeadline,
    estimatedValue: recommendation.estimatedValue,
    status,
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
