export type TaikosQueueStatus =
  | "queued"
  | "ready"
  | "blocked"
  | "executed"
  | "cancelled"
  | "failed";

export type TaikosQueueItem = {
  queueId: string;
  salonId: string;
  operatorId: string;
  draftId: string;
  draftTitle: string;
  draftType: string;
  goalId?: string;
  goalTitle?: string;
  status: TaikosQueueStatus;
  estimatedValue: number;
  createdAt: string;
  updatedAt: string;
  /** Snapshot of edited invite copy from draft at queue time. */
  inviteCard?: import("@/lib/vmb/cards/queued-invite-card-payload").QueuedInviteCardPayload;
};

export type TaikosQueueSummary = {
  totalItems: number;
  queuedItems: number;
  readyItems: number;
  blockedItems: number;
  completedItems: number;
  recentItems: TaikosQueueItem[];
  allItems: TaikosQueueItem[];
};

export type CreateQueueItemInput = {
  salonId: string;
  operatorId: string;
  draftId: string;
  draftTitle: string;
  draftType: string;
  goalId?: string;
  goalTitle?: string;
  estimatedValue?: number;
  inviteCard?: import("@/lib/vmb/cards/queued-invite-card-payload").QueuedInviteCardPayload;
};
