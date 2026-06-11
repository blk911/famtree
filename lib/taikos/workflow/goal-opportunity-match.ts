import type { TaikosGoalCategory, TaikosGoalListItem } from "@/lib/taikos/goals/types";
import type { TaikosOpportunity, TaikosOpportunityCategory } from "@/lib/taikos/opportunities/types";

function categoryForGoal(goalCategory: TaikosGoalCategory): TaikosOpportunityCategory[] {
  switch (goalCategory) {
    case "REFERRALS":
      return ["Referral"];
    case "PCN_GROWTH":
      return ["PCN Invite"];
    case "REACTIVATION":
      return ["Reactivation"];
    case "OPEN_SLOT_FILL":
      return ["Open Slot"];
    case "REVENUE":
      return ["Revenue Gap", "Campaign", "Birthday"];
    case "CLIENT_RETENTION":
      return ["Retention", "Reactivation"];
    default:
      return ["Campaign"];
  }
}

export function topOpportunityForGoal(
  goal: TaikosGoalListItem,
  opportunities: TaikosOpportunity[],
): TaikosOpportunity | undefined {
  const linked = opportunities.find((o) => o.linkedGoalId === goal.goalId);
  if (linked) return linked;

  const cats = categoryForGoal(goal.category);
  return opportunities.find((o) => cats.includes(o.category));
}
