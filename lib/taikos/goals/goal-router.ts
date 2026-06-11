import type { AiosContextPacket } from "@/lib/taikos/types";
import type { TaikosDraftType } from "@/lib/taikos/drafts/types";
import type { TaikosGoalCategory } from "./types";

export function defaultGoalsForSalon(
  salonId: string,
  operatorId: string,
  ctx: AiosContextPacket,
): Array<{
  title: string;
  category: TaikosGoalCategory;
  targetValue: number;
  currentValue: number;
}> {
  const pcnTarget = Math.max(20, ctx.pcnSummary.membersJoined + ctx.pcnSummary.invitesReady);
  const referralTarget = 10;
  const revenueTarget = Math.max(
    5000,
    Math.ceil(ctx.revenueSummary.potentialRevenue / 100) * 100 || 5000,
  );

  return [
    {
      title: "Get 20 PCN Members",
      category: "PCN_GROWTH",
      targetValue: pcnTarget,
      currentValue: ctx.pcnSummary.membersJoined,
    },
    {
      title: "Generate 10 Referrals",
      category: "REFERRALS",
      targetValue: referralTarget,
      currentValue: 0,
    },
    {
      title: "Increase Revenue",
      category: "REVENUE",
      targetValue: revenueTarget,
      currentValue: ctx.revenueSummary.potentialRevenue,
    },
  ];
}

export function goalCategoryForDraftType(draftType: TaikosDraftType): TaikosGoalCategory {
  switch (draftType) {
    case "pcn_invite":
      return "PCN_GROWTH";
    case "referral_ask":
      return "REFERRALS";
    case "reactivation":
      return "REACTIVATION";
    case "calendar_gap":
      return "OPEN_SLOT_FILL";
    case "campaign":
      return "REVENUE";
    case "service_card":
      return "CLIENT_RETENTION";
    default:
      return "CUSTOM";
  }
}

export function findActiveGoalForCategory(
  goals: Array<{ goalId: string; category: TaikosGoalCategory; status: string }>,
  category: TaikosGoalCategory,
): string | undefined {
  return goals.find((g) => g.category === category && g.status === "active")?.goalId;
}
