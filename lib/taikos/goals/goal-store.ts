import type { AiosContextPacket } from "@/lib/taikos/types";
import { getTaikosGoalsFile } from "@/lib/taikos/paths";
import { applyGoalProgress } from "./goal-progress";
import { defaultGoalsForSalon } from "./goal-router";
import { summarizeGoals } from "./goal-summary";
import {
  createGoalPostgres,
  getGoalByIdPostgres,
  listAllGoalsPostgres,
  updateGoalPostgres,
  upsertGoalsPostgres,
} from "@/lib/taikos/goals/goal-store-postgres";
import { readJsonArray, writeJsonArray } from "@/lib/taikos/storage/taikos-json-store";
import { assertTaikosWritableBackend, taikosJsonFallbackAllowed } from "@/lib/taikos/storage/taikos-storage-policy";
import { resolveTaikosStorageBackend } from "@/lib/taikos/storage/taikos-db";
import type {
  CreateTaikosGoalInput,
  TaikosGoal,
  TaikosGoalSummary,
  UpdateTaikosGoalInput,
} from "./types";
import { computeProgressPercent } from "./goal-progress";

function isGoal(item: unknown): item is TaikosGoal {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as TaikosGoal).goalId === "string"
  );
}

async function readAllJson(): Promise<TaikosGoal[]> {
  return readJsonArray(getTaikosGoalsFile(), isGoal);
}

async function writeAllJson(goals: TaikosGoal[]): Promise<void> {
  const err = await writeJsonArray(getTaikosGoalsFile(), goals);
  if (err) throw new Error(err);
}

export async function listGoals(salonId: string, limit = 50): Promise<TaikosGoal[]> {
  const all = await listAllGoals(salonId, limit * 2);
  return all.filter((g) => g.status !== "archived").slice(0, limit);
}

export async function listAllGoals(salonId: string, limit = 100): Promise<TaikosGoal[]> {
  const backend = await resolveTaikosStorageBackend();
  if (backend === "postgres") {
    const rows = await listAllGoalsPostgres(salonId, limit);
    if (rows.length > 0 || !taikosJsonFallbackAllowed()) return rows;
  }
  const all = await readAllJson();
  return all
    .filter((g) => g.salonId === salonId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

export async function getGoalById(salonId: string, goalId: string): Promise<TaikosGoal | null> {
  const backend = await resolveTaikosStorageBackend();
  if (backend === "postgres") {
    const row = await getGoalByIdPostgres(salonId, goalId);
    if (row || !taikosJsonFallbackAllowed()) return row;
  }
  const all = await readAllJson();
  return all.find((g) => g.salonId === salonId && g.goalId === goalId) ?? null;
}

export async function createGoal(input: CreateTaikosGoalInput): Promise<TaikosGoal> {
  const writable = await assertTaikosWritableBackend();
  if (!writable.ok) throw new Error(writable.error);

  if (writable.backend === "postgres") {
    const created = await createGoalPostgres(input);
    if ("error" in created) throw new Error(created.error);
    return created;
  }

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
  const all = await readAllJson();
  all.push(goal);
  await writeAllJson(all);
  return goal;
}

export async function updateGoal(
  salonId: string,
  goalId: string,
  patch: UpdateTaikosGoalInput,
): Promise<TaikosGoal | null> {
  const writable = await assertTaikosWritableBackend();
  if (!writable.ok) throw new Error(writable.error);

  if (writable.backend === "postgres") {
    const updated = await updateGoalPostgres(salonId, goalId, patch);
    if (updated && "error" in updated) throw new Error(updated.error);
    return updated && !("error" in updated) ? updated : null;
  }

  const all = await readAllJson();
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
    deadline: patch.deadline ?? current.deadline,
    priority: patch.priority ?? current.priority,
    notes: patch.notes ?? current.notes,
    linkedDrafts: patch.linkedDrafts ?? current.linkedDrafts,
    progressPercent: computeProgressPercent(currentValue, targetValue),
    updatedAt: new Date().toISOString(),
  };
  all[idx] = next;
  await writeAllJson(all);
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

export async function ensureDefaultGoals(ctx: AiosContextPacket): Promise<TaikosGoal[]> {
  const existing = await listGoals(ctx.salonId, 100);
  if (existing.length > 0) return syncGoalsWithContext(ctx);

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
  const backend = await resolveTaikosStorageBackend();
  const salonGoals = (await listAllGoals(ctx.salonId, 100)).filter(
    (g) => g.status !== "archived",
  );
  const updated: TaikosGoal[] = salonGoals.map((goal) => applyGoalProgress(goal, ctx));

  if (backend === "postgres") {
    const result = await upsertGoalsPostgres(updated);
    if (result.error) throw new Error(result.error);
    return updated;
  }

  const all = await readAllJson();
  for (const goal of updated) {
    const idx = all.findIndex((g) => g.goalId === goal.goalId);
    if (idx >= 0) all[idx] = goal;
  }
  await writeAllJson(all);
  return updated;
}

export async function summarizeGoalsForSalon(ctx: AiosContextPacket): Promise<TaikosGoalSummary> {
  const goals = await ensureDefaultGoals(ctx);
  return summarizeGoals(goals);
}
