import type { AiosContextPacket } from "@/lib/taikos/types";
import type { TaikosGoal, TaikosGoalCategory } from "./types";

export function computeProgressPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export function currentValueForCategory(
  category: TaikosGoalCategory,
  ctx: AiosContextPacket,
): number {
  switch (category) {
    case "PCN_GROWTH":
      return ctx.pcnSummary.membersJoined;
    case "REFERRALS": {
      const ref = ctx.opportunities.find((o) => o.sourceRule === "referral");
      const match = ref?.description.match(/(\d+)/);
      return match ? Number.parseInt(match[1], 10) : 0;
    }
    case "REACTIVATION":
      return ctx.clientSummary.likelyReactivations || ctx.clientSummary.overdueClients;
    case "OPEN_SLOT_FILL":
      return Math.max(0, ctx.calendarSummary.openSlots);
    case "REVENUE":
      return ctx.revenueSummary.potentialRevenue;
    case "CLIENT_RETENTION":
      return ctx.clientSummary.activeClients;
    default:
      return 0;
  }
}

export function applyGoalProgress(goal: TaikosGoal, ctx: AiosContextPacket): TaikosGoal {
  const currentValue = currentValueForCategory(goal.category, ctx);
  const progressPercent = computeProgressPercent(currentValue, goal.targetValue);
  let status = goal.status;
  if (status === "active" && progressPercent >= 100) {
    status = "completed";
  }
  return {
    ...goal,
    currentValue,
    progressPercent,
    status,
    updatedAt: new Date().toISOString(),
  };
}
