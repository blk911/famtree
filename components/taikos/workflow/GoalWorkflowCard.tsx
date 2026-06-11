"use client";

import { GoalProgress } from "@/components/taikos/goals/GoalProgress";
import { OpportunityWorkflowCard } from "@/components/taikos/workflow/OpportunityWorkflowCard";
import { topOpportunityForGoal } from "@/lib/taikos/workflow/goal-opportunity-match";
import type { TaikosGoalListItem } from "@/lib/taikos/goals/types";
import type { TaikosOpportunity } from "@/lib/taikos/opportunities/types";

type Props = {
  goal: TaikosGoalListItem;
  opportunities: TaikosOpportunity[];
  onRefresh?: () => void;
};

function formatValue(goal: TaikosGoalListItem, field: "current" | "target"): string {
  const value = field === "current" ? goal.currentValue : goal.targetValue;
  if (goal.category === "REVENUE") return `$${value.toLocaleString()}`;
  return String(value);
}

export function GoalWorkflowCard({ goal, opportunities, onRefresh }: Props) {
  const topOpp = topOpportunityForGoal(goal, opportunities);

  return (
    <article className="taikos-goal-workflow-card">
      <h4 className="taikos-goal-card__title">{goal.title}</h4>
      <p className="taikos-goal-card__counts">
        {formatValue(goal, "current")} / {formatValue(goal, "target")}
      </p>
      <GoalProgress percent={goal.progressPercent} />

      {topOpp ? (
        <div className="taikos-goal-workflow-card__opp">
          <p className="taikos-goal-workflow-card__opp-label">Best Next Action</p>
          <p className="taikos-goal-workflow-card__opp-title">{topOpp.title}</p>
          <p className="taikos-goal-workflow-card__opp-value">
            Value: <strong>${topOpp.estimatedValue.toLocaleString()}</strong>
          </p>
          <OpportunityWorkflowCard opportunity={topOpp} goalTitle={goal.title} embedded onRefresh={onRefresh} />
        </div>
      ) : (
        <p className="taikos-goal-workflow-card__empty">No ranked opportunity for this goal yet.</p>
      )}
    </article>
  );
}
