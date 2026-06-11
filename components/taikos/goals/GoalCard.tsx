"use client";

import { GoalProgress } from "@/components/taikos/goals/GoalProgress";
import type { TaikosGoalListItem } from "@/lib/taikos/goals/types";

type Props = {
  goal: TaikosGoalListItem;
};

function formatValue(goal: TaikosGoalListItem, field: "current" | "target"): string {
  const value = field === "current" ? goal.currentValue : goal.targetValue;
  if (goal.category === "REVENUE") return `$${value.toLocaleString()}`;
  return String(value);
}

export function GoalCard({ goal }: Props) {
  return (
    <article className="taikos-goal-card">
      <h4 className="taikos-goal-card__title">{goal.title}</h4>
      <p className="taikos-goal-card__counts">
        {formatValue(goal, "current")} / {formatValue(goal, "target")}
      </p>
      <GoalProgress percent={goal.progressPercent} />
    </article>
  );
}
