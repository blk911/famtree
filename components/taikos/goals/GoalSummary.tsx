"use client";

import Link from "next/link";
import { GoalCard } from "@/components/taikos/goals/GoalCard";
import type { TaikosGoalSummary } from "@/lib/taikos/goals/types";

type Props = {
  summary: TaikosGoalSummary;
};

export function GoalSummary({ summary }: Props) {
  if (summary.goals.length === 0) return null;
  return (
    <section className="taikos-goal-summary">
      <div className="vmb-today__section-head">
        <h3 className="taikos-section-title">Active Goals</h3>
        <Link href="/vmb/goals" className="vmb-today__link">
          Manage
        </Link>
      </div>
      <div className="taikos-goal-summary__grid">
        {summary.goals.map((goal) => (
          <GoalCard key={goal.goalId} goal={goal} />
        ))}
      </div>
    </section>
  );
}
