export type TaikosDraftType =
  | "pcn_invite"
  | "campaign"
  | "service_card"
  | "referral_ask"
  | "reactivation"
  | "calendar_gap";

export type TaikosDraftStatus =
  | "draft"
  | "reviewed"
  | "approved"
  | "ready_to_send"
  | "sent"
  | "archived"
  | "cancelled";

export type TaikosDraftAudit = {
  createdFromAction?: string;
  confirmedAt?: string;
  lastEditedAt?: string;
  archivedAt?: string;
};

export type TaikosDraft = {
  draftId: string;
  salonId: string;
  operatorId: string;
  createdAt: string;
  updatedAt: string;
  sourceActionId?: string;
  sourceRecommendationId?: string;
  sourcePage: string;
  draftType: TaikosDraftType;
  title: string;
  status: TaikosDraftStatus;
  payload: Record<string, unknown>;
  estimatedValue: number;
  audit: TaikosDraftAudit;
};

export type TaikosDraftListItem = {
  draftId: string;
  title: string;
  draftType: TaikosDraftType;
  status: TaikosDraftStatus;
  createdAt: string;
  estimatedValue: number;
};

export type TaikosDraftSummary = {
  totalDrafts: number;
  openDrafts: number;
  draftsByType: Partial<Record<TaikosDraftType, number>>;
  recentDrafts: TaikosDraftListItem[];
};

export type CreateTaikosDraftInput = Omit<TaikosDraft, "draftId" | "createdAt" | "updatedAt"> & {
  draftId?: string;
};

export type UpdateTaikosDraftInput = {
  title?: string;
  status?: TaikosDraftStatus;
  payload?: Record<string, unknown>;
  estimatedValue?: number;
};
