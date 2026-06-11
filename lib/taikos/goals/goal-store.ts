import { promises as fs } from "fs";
import path from "path";
import type { AiosContextPacket } from "@/lib/taikos/types";
import { getTaikosGoalsFile } from "@/lib/taikos/paths";
import { applyGoalProgress, computeProgressPercent } from "./goal-progress";
import { defaultGoalsForSalon } from "./goal-router";
import { summarizeGoals } from "./goal-summary";
import type {
  CreateTaikosGoalInput,
  TaikosGoal,
  TaikosGoalStatus,
  TaikosGoalSummary,
  UpdateTaikosGoalInput,
} from "./types";

type GoalFile = TaikosGoal[];

async function ensureDir(): Promise<void> {
  await fs.mkdir(path.dirname(getTaikosGoalsFile()), { recursive: true });
}

async function readAll(): Promise<GoalFile> {
  try {
    const raw = await fs.readFile(getTaikosGoalsFile(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GoalFile) : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(goals: GoalFile): Promise<void> {
  await ensureDir();
  const file = getTaikosGoalsFile();
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(goals, null, 2), "utf8");
  await fs.rename(tmp, file);
}

export async function listGoals(salonId: string, limit = 50): Promise<TaikosGoal[]> {
  const all = await readAll();
  return all
    .filter((g) => g.salonId === salonId && g.status !== "archived")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

export async function getGoalById(salonId: string, goalId: string): Promise<TaikosGoal | null> {
  const all = await readAll();
  return all.find((g) => g.salonId === salonId && g.goalId === goalId) ?? null;
}

export async function createGoal(input: CreateTaikosGoalInput): Promise<TaikosGoal> {
  const now = new Date().toISOString();
  const goal: TaikosGoal = {
    ...input,
    goalId: input.goalId ?? `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    opportunities: input.opportunities ?? [],
    linkedDrafts: input.linkedDrafts ?? [],
    progressPercent: computeProgressPercent(input.currentValue, input.targetValue),
    createdAt: now,
    updatedAt: now,
  };
  const all = await readAll();
  all.push(goal);
  await writeAll(all);
  return goal;
}

export async function updateGoal(
  salonId: string,
  goalId: string,
  patch: UpdateTaikosGoalInput,
): Promise<TaikosGoal | null> {
  const all = await readAll();
  const idx = all.findIndex((g) => g.salonId === salonId && g.goalId === goalId);
  if (idx < 0) return null;

  const current = all[idx];
  const targetValue = patch.targetValue ?? current.targetValue;
  const currentValue = patch.currentValue ?? current.currentValue;
  const next: TaikosGoal = {
    ...current,
    title: patch.title ?? current.title,
    category: patch.category ?? current.category,
    targetValue,
    currentValue,
    status: patch.status ?? current.status,
    linkedDrafts: patch.linkedDrafts ?? current.linkedDrafts,
    progressPercent: computeProgressPercent(currentValue, targetValue),
    updatedAt: new Date().toISOString(),
  };
  all[idx] = next;
  await writeAll(all);
  return next;
}

export async function linkDraftToGoal(
  salonId: string,
  goalId: string,
  draftId: string,
): Promise<TaikosGoal | null> {
  const goal = await getGoalById(salonId, goalId);
  if (!goal) return null;
  const linkedDrafts = goal.linkedDrafts.includes(draftId)
    ? goal.linkedDrafts
    : [...goal.linkedDrafts, draftId];
  return updateGoal(salonId, goalId, { linkedDrafts });
}

export async function ensureDefaultGoals(
  ctx: AiosContextPacket,
): Promise<TaikosGoal[]> {
  const existing = await listGoals(ctx.salonId, 100);
  if (existing.length > 0) {
    return syncGoalsWithContext(ctx);
  }

  const defaults = defaultGoalsForSalon(ctx.salonId, ctx.operatorId, ctx);
  for (const d of defaults) {
    await createGoal({
      salonId: ctx.salonId,
      operatorId: ctx.operatorId,
      title: d.title,
      category: d.category,
      targetValue: d.targetValue,
      currentValue: d.currentValue,
      status: "active",
    });
  }
  return syncGoalsWithContext(ctx);
}

export async function syncGoalsWithContext(ctx: AiosContextPacket): Promise<TaikosGoal[]> {
  const all = await readAll();
  const salonGoals = all.filter((g) => g.salonId === ctx.salonId && g.status !== "archived");
  const updated: TaikosGoal[] = [];

  for (const goal of salonGoals) {
    const synced = applyGoalProgress(goal, ctx);
    const idx = all.findIndex((g) => g.goalId === goal.goalId);
    if (idx >= 0) {
      all[idx] = synced;
      updated.push(synced);
    }
  }
  await writeAll(all);
  return updated;
}

export async function summarizeGoalsForSalon(
  ctx: AiosContextPacket,
): Promise<TaikosGoalSummary> {
  const goals = await ensureDefaultGoals(ctx);
  return summarizeGoals(goals);
}
