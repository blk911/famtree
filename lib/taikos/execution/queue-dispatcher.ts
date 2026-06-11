import { recordActivity } from "@/lib/taikos/activity/activity-builder";
import { getQueueItemById } from "@/lib/taikos/queue/queue-store";
import type { TaikosQueueItem } from "@/lib/taikos/queue/types";
import { strugbAdapter } from "./strugb-adapter";
import type { ExecuteQueueItemResult } from "./types";

/**
 * Future execution path: Queue → Execution Adapter → Provider.
 * UI must never call providers directly.
 */
export async function executeQueueItem(
  salonId: string,
  operatorId: string,
  queueId: string,
): Promise<ExecuteQueueItemResult | { error: string }> {
  const item = await getQueueItemById(salonId, queueId);
  if (!item) return { error: "Queue item not found" };
  if (item.status === "cancelled" || item.status === "executed") {
    return { error: "Queue item is not executable" };
  }

  const result = await strugbAdapter.executeQueueItem(item);

  await recordActivity({
    salonId,
    operatorId,
    kind: "queue_added",
    emoji: "⏸️",
    headline: `Execution preview only for “${item.draftTitle}”`,
    detail: result.message,
    linkedQueueId: item.queueId,
    linkedDraftId: item.draftId,
    linkedGoalId: item.goalId,
  });

  return result;
}

export function previewQueueItem(item: TaikosQueueItem): ExecuteQueueItemResult {
  return {
    status: "PREVIEW_ONLY",
    queueId: item.queueId,
    message: "Preview only — execution adapter not wired.",
    noSendGuarantee: true,
    noPaymentGuarantee: true,
  };
}
