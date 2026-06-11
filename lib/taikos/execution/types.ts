export type ExecutionResultStatus = "NOT_IMPLEMENTED" | "PREVIEW_ONLY";

export type ExecuteQueueItemResult = {
  status: ExecutionResultStatus;
  queueId: string;
  message: string;
  noSendGuarantee: true;
  noPaymentGuarantee: true;
};

export type ExecutionAdapterId = "strugb" | "stub";
