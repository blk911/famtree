import { getTaikosActivityStreamFile } from "@/lib/taikos/paths";
import {
  listActivitiesPostgres,
  recordActivityPostgres,
} from "@/lib/taikos/activity/activity-store-postgres";
import { readJsonArray, writeJsonArray } from "@/lib/taikos/storage/taikos-json-store";
import { assertTaikosWritableBackend, taikosJsonFallbackAllowed } from "@/lib/taikos/storage/taikos-storage-policy";
import { resolveTaikosStorageBackend } from "@/lib/taikos/storage/taikos-db";
import type { RecordActivityInput, TaikosActivityEvent } from "./activity-types";

function isActivity(item: unknown): item is TaikosActivityEvent {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as TaikosActivityEvent).activityId === "string"
  );
}

async function readAllJson(): Promise<TaikosActivityEvent[]> {
  return readJsonArray(getTaikosActivityStreamFile(), isActivity);
}

async function writeAllJson(events: TaikosActivityEvent[]): Promise<void> {
  const err = await writeJsonArray(getTaikosActivityStreamFile(), events);
  if (err) throw new Error(err);
}

export async function listActivities(salonId: string, limit = 40): Promise<TaikosActivityEvent[]> {
  const backend = await resolveTaikosStorageBackend();
  if (backend === "postgres") {
    const rows = await listActivitiesPostgres(salonId, limit);
    if (rows.length > 0 || !taikosJsonFallbackAllowed()) return rows;
  }
  const all = await readAllJson();
  return all
    .filter((e) => e.salonId === salonId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function recordActivity(input: RecordActivityInput): Promise<TaikosActivityEvent> {
  const writable = await assertTaikosWritableBackend();
  if (!writable.ok) throw new Error(writable.error);

  if (writable.backend === "postgres") {
    const created = await recordActivityPostgres(input);
    if ("error" in created) throw new Error(created.error);
    return created;
  }

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
  const all = await readAllJson();
  all.unshift(event);
  await writeAllJson(all.slice(0, 500));
  return event;
}
