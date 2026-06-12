import { parsePayload, prisma, resolveTaikosStorageBackend } from "@/lib/taikos/storage/taikos-db";
import type { RecordActivityInput, TaikosActivityEvent } from "@/lib/taikos/activity/activity-types";

function isActivity(item: unknown): item is TaikosActivityEvent {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as TaikosActivityEvent).activityId === "string"
  );
}

function rowToActivity(row: { payload: unknown }): TaikosActivityEvent | undefined {
  return parsePayload(row.payload, isActivity);
}

export async function listActivitiesPostgres(
  salonId: string,
  limit = 40,
): Promise<TaikosActivityEvent[]> {
  if ((await resolveTaikosStorageBackend()) !== "postgres") return [];
  try {
    const rows = await prisma.$queryRaw<Array<{ payload: unknown }>>`
      SELECT payload FROM taikos_activity
      WHERE salon_id = ${salonId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows.map(rowToActivity).filter((e): e is TaikosActivityEvent => !!e);
  } catch {
    return [];
  }
}

export async function recordActivityPostgres(
  input: RecordActivityInput,
): Promise<TaikosActivityEvent | { error: string }> {
  if ((await resolveTaikosStorageBackend()) !== "postgres") {
    return { error: "Postgres backend unavailable" };
  }
  try {
    const now = new Date().toISOString();
    const event: TaikosActivityEvent = {
      activityId: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      salonId: input.salonId,
      operatorId: input.operatorId,
      kind: input.kind,
      emoji: input.emoji,
      headline: input.headline,
      detail: input.detail,
      linkedGoalId: input.linkedGoalId,
      linkedDraftId: input.linkedDraftId,
      linkedQueueId: input.linkedQueueId,
      estimatedValue: input.estimatedValue,
      createdAt: now,
    };

    await prisma.$executeRaw`
      INSERT INTO taikos_activity (id, salon_id, type, title, summary, payload, created_at)
      VALUES (
        ${event.activityId},
        ${event.salonId},
        ${event.kind},
        ${event.headline},
        ${event.detail ?? null},
        ${JSON.stringify(event)}::jsonb,
        ${now}::timestamptz
      )
    `;
    return event;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
