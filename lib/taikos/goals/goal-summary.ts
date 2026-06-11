import type { TaikosGoal, TaikosGoalSummary } from "./types";

function toListItem(g: TaikosGoal) {
  return {
    goalId: g.goalId,
    title: g.title,
    category: g.category,
    targetValue: g.targetValue,
    currentValue: g.currentValue,
    progressPercent: g.progressPercent,
    status: g.status,
    deadline: g.deadline,
    priority: g.priority,
    notes: g.notes,
  };
}

export function summarizeGoals(goals: TaikosGoal[]): TaikosGoalSummary {
  const active = goals.filter((g) => g.status === "active");
  const completed = goals.filter((g) => g.status === "completed");
  const archived = goals.filter((g) => g.status === "archived");
  return {
    totalGoals: goals.length,
    activeGoals: active.length,
    completedGoals: completed.length,
    archivedGoals: archived.length,
    goals: active
      .sort((a, b) => b.progressPercent - a.progressPercent)
      .map(toListItem),
  };
}

export function summarizeAllGoals(goals: TaikosGoal[]): TaikosGoalSummary {
  const active = goals.filter((g) => g.status === "active");
  const completed = goals.filter((g) => g.status === "completed");
  const archived = goals.filter((g) => g.status === "archived");
  const visible = goals.filter((g) => g.status !== "archived");
  return {
    totalGoals: goals.length,
    activeGoals: active.length,
    completedGoals: completed.length,
    archivedGoals: archived.length,
    goals: visible.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(toListItem),
  };
}
