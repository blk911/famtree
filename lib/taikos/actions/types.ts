import type { TaikosDeliverable } from "@/lib/taikos/deliverables/types";
import type { TaikosActionType } from "@/lib/taikos/types";

export type { TaikosActionType };

export type TaikosActionStatus =
  | "preview"
  | "confirmed"
  | "executed"
  | "failed"
  | "cancelled";

export type TaikosActionContract = {
  actionId: string;
  type: TaikosActionType;
  label: string;
  description: string;
  source: string;
  payload: Record<string, string>;
  requiresConfirmation: boolean;
  destructive: boolean;
  status: TaikosActionStatus;
};

export type TaikosActionPreviewResult = {
  action: TaikosActionContract;
  deliverable: TaikosDeliverable;
  previewId: string;
  noSendGuarantee: true;
};

export type TaikosActionLogEntry = {
  id: string;
  timestamp: string;
  salonId: string;
  operatorId: string;
  actionType: TaikosActionType;
  actionLabel: string;
  payloadSummary: string;
  status: TaikosActionStatus;
  sourcePage: string;
  sourceRecommendationId?: string;
  deliverableType?: string;
  deliverableId?: string;
};

export type TaikosConfirmResult = {
  ok: true;
  logEntry: TaikosActionLogEntry;
  message: string;
  draftId?: string;
  draftHref?: string;
  draftReviewHint?: string;
};
