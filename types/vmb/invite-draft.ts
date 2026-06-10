export type InviteDraftStatus = "draft" | "approved" | "skipped" | "sent";

export type InviteDraftType = "private_client_network";

export type VmbInviteDraft = {
  draftId: string;
  trialId: string;
  analysisId: string;
  clientName: string;
  email?: string;
  phone?: string;
  reasonSelected: string;
  inviteType: InviteDraftType;
  potentialValue: number;
  status: InviteDraftStatus;
  subject: string;
  editableMessage: string;
  lockedFooter: string;
  candidateScore: number;
  createdAt: string;
  updatedAt: string;
};

export type BuildInviteDraftsInput = {
  trialId: string;
  analysisId: string;
  salonName?: string;
};

export type PatchInviteDraftInput = {
  status?: InviteDraftStatus;
  editableMessage?: string;
};
