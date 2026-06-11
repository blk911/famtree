import type { TaikosQueueItem, TaikosQueueSummary } from "./types";

export function summarizeQueue(items: TaikosQueueItem[], limit = 8): TaikosQueueSummary {
  const active = items.filter((i) => i.status === "queued" || i.status === "ready");
  return {
    totalItems: items.length,
    queuedItems: items.filter((i) => i.status === "queued").length,
    readyItems: items.filter((i) => i.status === "ready").length,
    recentItems: active.slice(0, limit),
  };
}

export async function summarizeQueueForSalon(
  listFn: (salonId: string) => Promise<TaikosQueueItem[]>,
  salonId: string,
): Promise<TaikosQueueSummary> {
  const items = await listFn(salonId);
  return summarizeQueue(items);
}
