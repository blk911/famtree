import { getTaikosExecutionQueueFile } from "@/lib/taikos/paths";
import {
  createQueueItemPostgres,
  getQueueItemByIdPostgres,
  listAllQueueItemsPostgres,
  updateQueueItemStatusPostgres,
} from "@/lib/taikos/queue/queue-store-postgres";
import { readJsonArray, writeJsonArray } from "@/lib/taikos/storage/taikos-json-store";
import { assertTaikosWritableBackend, taikosJsonFallbackAllowed } from "@/lib/taikos/storage/taikos-storage-policy";
import { resolveTaikosStorageBackend } from "@/lib/taikos/storage/taikos-db";
import type { CreateQueueItemInput, TaikosQueueItem, TaikosQueueStatus } from "./types";

function isQueueItem(item: unknown): item is TaikosQueueItem {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as TaikosQueueItem).queueId === "string"
  );
}

async function readAllJson(): Promise<TaikosQueueItem[]> {
  return readJsonArray(getTaikosExecutionQueueFile(), isQueueItem);
}

async function writeAllJson(items: TaikosQueueItem[]): Promise<void> {
  const err = await writeJsonArray(getTaikosExecutionQueueFile(), items);
  if (err) throw new Error(err);
}

export async function listAllQueueItems(salonId: string, limit = 100): Promise<TaikosQueueItem[]> {
  const backend = await resolveTaikosStorageBackend();
  if (backend === "postgres") {
    const rows = await listAllQueueItemsPostgres(salonId, limit);
    if (rows.length > 0 || !taikosJsonFallbackAllowed()) return rows;
  }
  const all = await readAllJson();
  return all
    .filter((q) => q.salonId === salonId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

export async function listQueueItems(salonId: string, limit = 50): Promise<TaikosQueueItem[]> {
  const all = await listAllQueueItems(salonId, limit * 2);
  return all
    .filter((q) => q.status !== "cancelled" && q.status !== "executed")
    .slice(0, limit);
}

export async function getQueueItemById(
  salonId: string,
  queueId: string,
): Promise<TaikosQueueItem | null> {
  const backend = await resolveTaikosStorageBackend();
  if (backend === "postgres") {
    const row = await getQueueItemByIdPostgres(salonId, queueId);
    if (row || !taikosJsonFallbackAllowed()) return row;
  }
  const all = await readAllJson();
  return all.find((q) => q.salonId === salonId && q.queueId === queueId) ?? null;
}

export async function createQueueItem(input: CreateQueueItemInput): Promise<TaikosQueueItem> {
  const writable = await assertTaikosWritableBackend();
  if (!writable.ok) throw new Error(writable.error);

  if (writable.backend === "postgres") {
    const created = await createQueueItemPostgres(input);
    if ("error" in created) throw new Error(created.error);
    return created;
  }

  const now = new Date().toISOString();
  const all = await readAllJson();
  const existing = all.find(
    (q) => q.salonId === input.salonId && q.draftId === input.draftId && q.status === "queued",
  );
  if (existing) return existing;

  const item: TaikosQueueItem = {
    queueId: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    salonId: input.salonId,
    operatorId: input.operatorId,
    draftId: input.draftId,
    draftTitle: input.draftTitle,
    draftType: input.draftType,
    goalId: input.goalId,
    goalTitle: input.goalTitle,
    status: "queued",
    estimatedValue: input.estimatedValue ?? 0,
    createdAt: now,
    updatedAt: now,
  };
  all.push(item);
  await writeAllJson(all);
  return item;
}

export async function updateQueueItemStatus(
  salonId: string,
  queueId: string,
  status: TaikosQueueStatus,
): Promise<TaikosQueueItem | null> {
  const writable = await assertTaikosWritableBackend();
  if (!writable.ok) throw new Error(writable.error);

  if (writable.backend === "postgres") {
    const updated = await updateQueueItemStatusPostgres(salonId, queueId, status);
    if (updated && "error" in updated) throw new Error(updated.error);
    return updated && !("error" in updated) ? updated : null;
  }

  const all = await readAllJson();
  const idx = all.findIndex((q) => q.salonId === salonId && q.queueId === queueId);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], status, updatedAt: new Date().toISOString() };
  await writeAllJson(all);
  return all[idx];
}
