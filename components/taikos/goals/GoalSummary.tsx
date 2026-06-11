"use client";

import { GoalCard } from "@/components/taikos/goals/GoalCard";
import type { TaikosGoalSummary } from "@/lib/taikos/goals/types";

type Props = {
  summary: TaikosGoalSummary;
};

export function GoalSummary({ summary }: Props) {
  if (summary.goals.length === 0) return null;
  return (
    <section className="taikos-goal-summary">
      <h3 className="taikos-section-title">Active Goals</h3>
      <div className="taikos-goal-summary__grid">
        {summary.goals.map((goal) => (
          <GoalCard key={goal.goalId} goal={goal} />
        ))}
      </div>
    </section>
  );
}
