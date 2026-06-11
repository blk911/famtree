import type { TaikosQueueItem } from "@/lib/taikos/queue/types";
import { EXECUTION_STUB_MESSAGE, defaultExecutionStatus } from "./execution-status";
import type { ExecutionAdapter } from "./execution-adapter";
import type { ExecuteQueueItemResult } from "./types";

/** Strugb execution envelope — stub only; no outbound activity. */
export const strugbAdapter: ExecutionAdapter = {
  id: "strugb",
  async executeQueueItem(item: TaikosQueueItem): Promise<ExecuteQueueItemResult> {
    return {
      status: defaultExecutionStatus(),
      queueId: item.queueId,
      message: EXECUTION_STUB_MESSAGE,
      noSendGuarantee: true,
      noPaymentGuarantee: true,
    };
  },
};
