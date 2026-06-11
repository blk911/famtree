"use client";

import Link from "next/link";
import { GoalWorkflowCard } from "@/components/taikos/workflow/GoalWorkflowCard";
import type { TaikosGoalSummary } from "@/lib/taikos/goals/types";
import type { TaikosOpportunity } from "@/lib/taikos/opportunities/types";

type Props = {
  summary: TaikosGoalSummary;
  opportunities?: TaikosOpportunity[];
  onRefresh?: () => void;
};

export function GoalSummary({ summary, opportunities = [], onRefresh }: Props) {
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
          <GoalWorkflowCard
            key={goal.goalId}
            goal={goal}
            opportunities={opportunities}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </section>
  );
}
