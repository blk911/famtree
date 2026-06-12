import { parsePayload, prisma, resolveTaikosStorageBackend } from "@/lib/taikos/storage/taikos-db";
import { computeProgressPercent } from "@/lib/taikos/goals/goal-progress";
import type {
  CreateTaikosGoalInput,
  TaikosGoal,
  UpdateTaikosGoalInput,
} from "@/lib/taikos/goals/types";

function isGoal(item: unknown): item is TaikosGoal {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as TaikosGoal).goalId === "string" &&
    typeof (item as TaikosGoal).salonId === "string"
  );
}

function rowToGoal(row: { payload: unknown }): TaikosGoal | undefined {
  return parsePayload(row.payload, isGoal);
}

export async function listAllGoalsPostgres(salonId: string, limit = 100): Promise<TaikosGoal[]> {
  if ((await resolveTaikosStorageBackend()) !== "postgres") return [];
  try {
    const rows = await prisma.$queryRaw<Array<{ payload: unknown }>>`
      SELECT payload FROM taikos_goal
      WHERE salon_id = ${salonId}
      ORDER BY updated_at DESC
      LIMIT ${limit}
    `;
    return rows.map(rowToGoal).filter((g): g is TaikosGoal => !!g);
  } catch {
    return [];
  }
}

export async function getGoalByIdPostgres(
  salonId: string,
  goalId: string,
): Promise<TaikosGoal | null> {
  if ((await resolveTaikosStorageBackend()) !== "postgres") return null;
  try {
    const rows = await prisma.$queryRaw<Array<{ payload: unknown }>>`
      SELECT payload FROM taikos_goal WHERE salon_id = ${salonId} AND id = ${goalId} LIMIT 1
    `;
    return rowToGoal(rows[0] ?? { payload: null }) ?? null;
  } catch {
    return null;
  }
}

export async function createGoalPostgres(
  input: CreateTaikosGoalInput,
): Promise<TaikosGoal | { error: string }> {
  if ((await resolveTaikosStorageBackend()) !== "postgres") {
    return { error: "Postgres backend unavailable" };
  }
  try {
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

    await prisma.$executeRaw`
      INSERT INTO taikos_goal (id, salon_id, status, title, payload, created_at, updated_at)
      VALUES (
        ${goal.goalId},
        ${goal.salonId},
        ${goal.status},
        ${goal.title},
        ${JSON.stringify(goal)}::jsonb,
        ${now}::timestamptz,
        ${now}::timestamptz
      )
    `;
    return goal;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateGoalPostgres(
  salonId: string,
  goalId: string,
  patch: UpdateTaikosGoalInput,
): Promise<TaikosGoal | null | { error: string }> {
  if ((await resolveTaikosStorageBackend()) !== "postgres") {
    return { error: "Postgres backend unavailable" };
  }
  try {
    const current = await getGoalByIdPostgres(salonId, goalId);
    if (!current) return null;
    const targetValue = patch.targetValue ?? current.targetValue;
    const currentValue = patch.currentValue ?? current.currentValue;
    const now = new Date().toISOString();
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
      updatedAt: now,
    };

    await prisma.$executeRaw`
      UPDATE taikos_goal
      SET status = ${next.status},
          title = ${next.title},
          payload = ${JSON.stringify(next)}::jsonb,
          updated_at = ${now}::timestamptz
      WHERE salon_id = ${salonId} AND id = ${goalId}
    `;
    return next;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function upsertGoalsPostgres(goals: TaikosGoal[]): Promise<{ error?: string }> {
  if ((await resolveTaikosStorageBackend()) !== "postgres") {
    return { error: "Postgres backend unavailable" };
  }
  try {
    for (const goal of goals) {
      await prisma.$executeRaw`
        INSERT INTO taikos_goal (id, salon_id, status, title, payload, created_at, updated_at)
        VALUES (
          ${goal.goalId},
          ${goal.salonId},
          ${goal.status},
          ${goal.title},
          ${JSON.stringify(goal)}::jsonb,
          ${goal.createdAt}::timestamptz,
          ${goal.updatedAt}::timestamptz
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          title = EXCLUDED.title,
          payload = EXCLUDED.payload,
          updated_at = EXCLUDED.updated_at
      `;
    }
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
