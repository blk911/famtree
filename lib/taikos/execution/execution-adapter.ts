import type { TaikosQueueItem } from "@/lib/taikos/queue/types";
import type { ExecuteQueueItemResult, ExecutionAdapterId } from "./types";

export type ExecutionAdapter = {
  id: ExecutionAdapterId;
  executeQueueItem(item: TaikosQueueItem): Promise<ExecuteQueueItemResult>;
};
