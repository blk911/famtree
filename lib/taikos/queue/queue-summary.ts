import type { TaikosQueueItem, TaikosQueueSummary } from "./types";

export function summarizeQueue(items: TaikosQueueItem[], limit = 8): TaikosQueueSummary {
  const active = items.filter(
    (i) => i.status === "queued" || i.status === "ready" || i.status === "blocked",
  );
  return {
    totalItems: items.length,
    queuedItems: items.filter((i) => i.status === "queued").length,
    readyItems: items.filter((i) => i.status === "ready").length,
    blockedItems: items.filter((i) => i.status === "blocked").length,
    completedItems: items.filter((i) => i.status === "executed").length,
    recentItems: active.slice(0, limit),
    allItems: items,
  };
}

export async function summarizeQueueForSalon(
  listFn: (salonId: string) => Promise<TaikosQueueItem[]>,
  salonId: string,
): Promise<TaikosQueueSummary> {
  const items = await listFn(salonId);
  return summarizeQueue(items);
}
