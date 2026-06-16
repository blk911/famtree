export type InviteDraftStatus = "draft" | "approved" | "skipped" | "sent";

/** @deprecated Use InviteDraftCategory — kept for stored JSON compatibility. */
export type InviteDraftType = "private_client_network";

export type InviteDraftCategory =
  | "private_client_network"
  | "new_client_welcome"
  | "revenue_touch"
  | "trusted_intro_request";

export type VmbInviteDraft = {
  draftId: string;
  trialId: string;
  analysisId: string;
  clientName: string;
  email?: string;
  phone?: string;
  /** Human-readable reason shown in salon UI. */
  reasonSelected: string;
  inviteCategory: InviteDraftCategory;
  /** Legacy alias — mirrors inviteCategory for private network rows. */
  inviteType?: InviteDraftType;
  potentialValue: number;
  status: InviteDraftStatus;
  subject: string;
  editableMessage: string;
  lockedFooter: string;
  candidateScore?: number;
  createdAt: string;
  updatedAt: string;
  /** Linked salon offer from Offers page — included when invite is sent. */
  salonOfferCatalogId?: string;
};

export type BuildInviteDraftsInput = {
  trialId: string;
  analysisId: string;
  salonName?: string;
};

export type PatchInviteDraftInput = {
  status?: InviteDraftStatus;
  editableMessage?: string;
  salonOfferCatalogId?: string | null;
};
