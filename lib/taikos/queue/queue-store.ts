import { promises as fs } from "fs";
import path from "path";
import { getTaikosExecutionQueueFile } from "@/lib/taikos/paths";
import type { CreateQueueItemInput, TaikosQueueItem, TaikosQueueStatus } from "./types";

type QueueFile = TaikosQueueItem[];

async function ensureDir(): Promise<void> {
  await fs.mkdir(path.dirname(getTaikosExecutionQueueFile()), { recursive: true });
}

async function readAll(): Promise<QueueFile> {
  try {
    const raw = await fs.readFile(getTaikosExecutionQueueFile(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueueFile) : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(items: QueueFile): Promise<void> {
  await ensureDir();
  const file = getTaikosExecutionQueueFile();
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf8");
  await fs.rename(tmp, file);
}

export async function listAllQueueItems(salonId: string, limit = 100): Promise<TaikosQueueItem[]> {
  const all = await readAll();
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
  const all = await readAll();
  return all.find((q) => q.salonId === salonId && q.queueId === queueId) ?? null;
}

export async function createQueueItem(input: CreateQueueItemInput): Promise<TaikosQueueItem> {
  const now = new Date().toISOString();
  const all = await readAll();
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
  await writeAll(all);
  return item;
}

export async function updateQueueItemStatus(
  salonId: string,
  queueId: string,
  status: TaikosQueueStatus,
): Promise<TaikosQueueItem | null> {
  const all = await readAll();
  const idx = all.findIndex((q) => q.salonId === salonId && q.queueId === queueId);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], status, updatedAt: new Date().toISOString() };
  await writeAll(all);
  return all[idx];
}
