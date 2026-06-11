import { promises as fs } from "fs";
import path from "path";
import { getTaikosActivityStreamFile } from "@/lib/taikos/paths";
import type { RecordActivityInput, TaikosActivityEvent } from "./activity-types";

type ActivityFile = TaikosActivityEvent[];

async function ensureDir(): Promise<void> {
  await fs.mkdir(path.dirname(getTaikosActivityStreamFile()), { recursive: true });
}

async function readAll(): Promise<ActivityFile> {
  try {
    const raw = await fs.readFile(getTaikosActivityStreamFile(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ActivityFile) : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(events: ActivityFile): Promise<void> {
  await ensureDir();
  const file = getTaikosActivityStreamFile();
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(events, null, 2), "utf8");
  await fs.rename(tmp, file);
}

export async function listActivities(salonId: string, limit = 40): Promise<TaikosActivityEvent[]> {
  const all = await readAll();
  return all
    .filter((e) => e.salonId === salonId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function recordActivity(input: RecordActivityInput): Promise<TaikosActivityEvent> {
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
  const all = await readAll();
  all.unshift(event);
  await writeAll(all.slice(0, 500));
  return event;
}
