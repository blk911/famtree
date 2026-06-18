import type { InviteTemplateSnapshot } from "@/lib/vmb/invites/invite-template-snapshot";

export type SalonInvitationApprovalStatus = "approved" | "sent" | "paused";

export type SalonInvitationApproval = {
  id: string;
  salonId: string;
  clientName: string;
  clientEmail?: string;
  opportunityId?: string;
  opportunityType: string;
  sourceCopyId: string;
  sourceTemplateId: string;
  snapshot: InviteTemplateSnapshot;
  reasonText: string;
  estimatedValue?: number;
  status: SalonInvitationApprovalStatus;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateSalonInvitationApprovalInput = {
  clientName: string;
  clientEmail?: string;
  opportunityId?: string;
  opportunityType: string;
  sourceCopyId: string;
  sourceTemplateId: string;
  snapshot: InviteTemplateSnapshot;
  reasonText: string;
  estimatedValue?: number;
  status: SalonInvitationApprovalStatus;
};
