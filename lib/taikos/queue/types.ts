export type TaikosQueueStatus = "queued" | "ready" | "executed" | "cancelled" | "failed";

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
};

export type TaikosQueueSummary = {
  totalItems: number;
  queuedItems: number;
  readyItems: number;
  recentItems: TaikosQueueItem[];
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
};
