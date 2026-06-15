import { parsePayload, prisma, resolveTaikosStorageBackend } from "@/lib/taikos/storage/taikos-db";
import type {
  CreateQueueItemInput,
  TaikosQueueItem,
  TaikosQueueStatus,
} from "@/lib/taikos/queue/types";

function isQueueItem(item: unknown): item is TaikosQueueItem {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as TaikosQueueItem).queueId === "string" &&
    typeof (item as TaikosQueueItem).salonId === "string"
  );
}

function rowToItem(row: { payload: unknown }): TaikosQueueItem | undefined {
  return parsePayload(row.payload, isQueueItem);
}

export async function listAllQueueItemsPostgres(
  salonId: string,
  limit = 100,
): Promise<TaikosQueueItem[]> {
  if ((await resolveTaikosStorageBackend()) !== "postgres") return [];
  try {
    const rows = await prisma.$queryRaw<Array<{ payload: unknown }>>`
      SELECT payload FROM taikos_queue_item
      WHERE salon_id = ${salonId}
      ORDER BY updated_at DESC
      LIMIT ${limit}
    `;
    return rows.map(rowToItem).filter((item): item is TaikosQueueItem => !!item);
  } catch {
    return [];
  }
}

export async function getQueueItemByIdPostgres(
  salonId: string,
  queueId: string,
): Promise<TaikosQueueItem | null> {
  if ((await resolveTaikosStorageBackend()) !== "postgres") return null;
  try {
    const rows = await prisma.$queryRaw<Array<{ payload: unknown }>>`
      SELECT payload FROM taikos_queue_item
      WHERE salon_id = ${salonId} AND id = ${queueId}
      LIMIT 1
    `;
    return rowToItem(rows[0] ?? { payload: null }) ?? null;
  } catch {
    return null;
  }
}

export async function findQueueItemByDraftIdGlobalPostgres(
  draftId: string,
): Promise<TaikosQueueItem | null> {
  if ((await resolveTaikosStorageBackend()) !== "postgres") return null;
  try {
    const rows = await prisma.$queryRaw<Array<{ payload: unknown }>>`
      SELECT payload FROM taikos_queue_item
      WHERE payload->>'draftId' = ${draftId} AND status <> 'cancelled'
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    return rowToItem(rows[0] ?? { payload: null }) ?? null;
  } catch {
    return null;
  }
}

export async function createQueueItemPostgres(
  input: CreateQueueItemInput,
): Promise<TaikosQueueItem | { error: string }> {
  if ((await resolveTaikosStorageBackend()) !== "postgres") {
    return { error: "Postgres backend unavailable" };
  }
  try {
    const existing = await prisma.$queryRaw<Array<{ payload: unknown }>>`
      SELECT payload FROM taikos_queue_item
      WHERE salon_id = ${input.salonId}
        AND payload->>'draftId' = ${input.draftId}
        AND status = 'queued'
      LIMIT 1
    `;
    const found = rowToItem(existing[0] ?? { payload: null });
    if (found) return found;

    const now = new Date().toISOString();
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
      inviteCard: input.inviteCard,
    };

    await prisma.$executeRaw`
      INSERT INTO taikos_queue_item (
        id, salon_id, type, status, title, summary, payload, created_at, updated_at
      )
      VALUES (
        ${item.queueId},
        ${item.salonId},
        ${item.draftType},
        ${item.status},
        ${item.draftTitle},
        ${item.goalTitle ?? null},
        ${JSON.stringify(item)}::jsonb,
        ${now}::timestamptz,
        ${now}::timestamptz
      )
    `;
    return item;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateQueueItemStatusPostgres(
  salonId: string,
  queueId: string,
  status: TaikosQueueStatus,
): Promise<TaikosQueueItem | null | { error: string }> {
  if ((await resolveTaikosStorageBackend()) !== "postgres") {
    return { error: "Postgres backend unavailable" };
  }
  try {
    const current = await getQueueItemByIdPostgres(salonId, queueId);
    if (!current) return null;
    const now = new Date().toISOString();
    const next: TaikosQueueItem = { ...current, status, updatedAt: now };
    await prisma.$executeRaw`
      UPDATE taikos_queue_item
      SET status = ${status},
          payload = ${JSON.stringify(next)}::jsonb,
          updated_at = ${now}::timestamptz
      WHERE salon_id = ${salonId} AND id = ${queueId}
    `;
    return next;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
