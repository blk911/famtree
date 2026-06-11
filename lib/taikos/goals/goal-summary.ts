import type { TaikosGoal, TaikosGoalSummary } from "./types";

export function summarizeGoals(goals: TaikosGoal[]): TaikosGoalSummary {
  const active = goals.filter((g) => g.status === "active");
  return {
    totalGoals: goals.length,
    activeGoals: active.length,
    goals: active
      .sort((a, b) => b.progressPercent - a.progressPercent)
      .map((g) => ({
        goalId: g.goalId,
        title: g.title,
        category: g.category,
        targetValue: g.targetValue,
        currentValue: g.currentValue,
        progressPercent: g.progressPercent,
        status: g.status,
      })),
  };
}
