export type TaikosActivityKind =
  | "pcn_join"
  | "referral"
  | "open_slot"
  | "draft_created"
  | "draft_approved"
  | "service_card"
  | "goal_progress"
  | "queue_added"
  | "campaign"
  | "cancellation"
  | "custom";

export type TaikosActivityEvent = {
  activityId: string;
  salonId: string;
  operatorId: string;
  kind: TaikosActivityKind;
  emoji: string;
  headline: string;
  detail?: string;
  linkedGoalId?: string;
  linkedDraftId?: string;
  linkedQueueId?: string;
  estimatedValue?: number;
  createdAt: string;
};

export type TaikosActivitySummary = {
  totalEvents: number;
  recentEvents: TaikosActivityEvent[];
};

export type RecordActivityInput = {
  salonId: string;
  operatorId: string;
  kind: TaikosActivityKind;
  emoji: string;
  headline: string;
  detail?: string;
  linkedGoalId?: string;
  linkedDraftId?: string;
  linkedQueueId?: string;
  estimatedValue?: number;
};
