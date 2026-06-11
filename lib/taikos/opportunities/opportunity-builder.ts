import type { AiosContextPacket } from "@/lib/taikos/types";
import { findActiveGoalForCategory, goalCategoryForDraftType } from "@/lib/taikos/goals/goal-router";
import type { TaikosGoalListItem } from "@/lib/taikos/goals/types";
import { scoreOpportunity } from "./opportunity-score";
import type { TaikosOpportunity, TaikosOpportunityCategory } from "./types";

function categoryFromRule(rule?: string): TaikosOpportunityCategory {
  switch (rule) {
    case "referral":
      return "Referral";
    case "reactivation":
      return "Reactivation";
    case "birthday":
      return "Birthday";
    case "open-slot":
      return "Open Slot";
    case "pcn-invite":
      return "PCN Invite";
    default:
      return "Campaign";
  }
}

function actionFromCategory(cat: TaikosOpportunityCategory): TaikosOpportunity["suggestedAction"] {
  switch (cat) {
    case "Referral":
      return "PREVIEW_REFERRAL_ASK";
    case "Reactivation":
      return "PREVIEW_REACTIVATION_MESSAGE";
    case "Open Slot":
      return "VIEW_CALENDAR_GAP";
    case "PCN Invite":
      return "CONTINUE_PCN_INVITES";
    case "Birthday":
    case "Campaign":
    case "Revenue Gap":
      return "CREATE_CAMPAIGN_DRAFT";
    case "Retention":
      return "CREATE_SERVICE_CARD_DRAFT";
    default:
      return "CREATE_INVITE_DRAFT";
  }
}

function goalCategoryForOpp(cat: TaikosOpportunityCategory) {
  return goalCategoryForDraftType(
    cat === "Referral"
      ? "referral_ask"
      : cat === "Reactivation"
        ? "reactivation"
        : cat === "Open Slot"
          ? "calendar_gap"
          : cat === "PCN Invite"
            ? "pcn_invite"
            : cat === "Retention"
              ? "service_card"
              : "campaign",
  );
}

export function buildRankedOpportunities(
  ctx: AiosContextPacket,
  goals: TaikosGoalListItem[] = [],
): TaikosOpportunity[] {
  const built: TaikosOpportunity[] = [];

  for (const opp of ctx.opportunities) {
    const category = categoryFromRule(opp.sourceRule);
    const confidence = opp.severity === "urgent" ? 90 : opp.severity === "priority" ? 75 : 60;
    const { score, priority } = scoreOpportunity(opp.estimatedValue, confidence, ctx.hasRealBookData);
    const linkedGoalId = findActiveGoalForCategory(goals, goalCategoryForOpp(category));

    built.push({
      opportunityId: `opp-${opp.id}`,
      title: opp.title,
      category,
      estimatedValue: opp.estimatedValue,
      confidence,
      recommendation: opp.description,
      suggestedAction: actionFromCategory(category),
      linkedGoalId,
      priority,
      score,
    });
  }

  if (ctx.pcnSummary.invitesReady > 0) {
    const value = ctx.pcnSummary.invitesReady * 85;
    const { score, priority } = scoreOpportunity(value, 78, ctx.hasRealBookData);
    built.push({
      opportunityId: "opp-pcn-ready",
      title: "Continue PCN invitations",
      category: "PCN Invite",
      estimatedValue: value,
      confidence: 78,
      recommendation: `${ctx.pcnSummary.invitesReady} clients ready for your private network.`,
      suggestedAction: "CONTINUE_PCN_INVITES",
      linkedGoalId: findActiveGoalForCategory(goals, "PCN_GROWTH"),
      priority,
      score,
    });
  }

  if (ctx.revenueSummary.potentialRevenue > 0 && built.length < 3) {
    const gap = Math.max(0, 5000 - ctx.revenueSummary.potentialRevenue);
    if (gap > 0) {
      const { score, priority } = scoreOpportunity(gap, 70, ctx.hasRealBookData);
      built.push({
        opportunityId: "opp-revenue-gap",
        title: "Revenue gap to weekly target",
        category: "Revenue Gap",
        estimatedValue: gap,
        confidence: 70,
        recommendation: `About $${gap.toLocaleString()} left to hit your revenue goal.`,
        suggestedAction: "CREATE_CAMPAIGN_DRAFT",
        linkedGoalId: findActiveGoalForCategory(goals, "REVENUE"),
        priority,
        score,
      });
    }
  }

  return built.sort((a, b) => b.score - a.score);
}
