import { briefingVariant } from "@/lib/taikos/session/session-manager";
import type { AiosContextPacket, MorningBriefing } from "@/lib/taikos/types";

function operatorFirstName(ctx: AiosContextPacket): string {
  const raw = ctx.operatorName ?? ctx.salonName;
  return raw.trim().split(/\s+/)[0] || "there";
}

function formatGoalLine(ctx: AiosContextPacket): string {
  const goals = ctx.goalSummary.goals.slice(0, 3);
  if (goals.length === 0) return "";
  return goals
    .map((g) => {
      const isRevenue = g.category === "REVENUE";
      const current = isRevenue ? `$${g.currentValue.toLocaleString()}` : String(g.currentValue);
      const target = isRevenue ? `$${g.targetValue.toLocaleString()}` : String(g.targetValue);
      return `${g.title}\n${current} / ${target}`;
    })
    .join("\n\n");
}

function buildPhase5Summary(ctx: AiosContextPacket, jenny: string): string {
  const top = ctx.opportunitySummary.topOpportunity;
  const goalLines = formatGoalLine(ctx);
  const blocks: string[] = [];

  blocks.push(`You have:`);
  blocks.push(`• ${ctx.goalSummary.activeGoals} active goal${ctx.goalSummary.activeGoals === 1 ? "" : "s"}`);
  blocks.push(`• ${ctx.opportunitySummary.totalOpportunities} opportunit${ctx.opportunitySummary.totalOpportunities === 1 ? "y" : "ies"}`);
  blocks.push(`• ${ctx.queueSummary.queuedItems} queued action${ctx.queueSummary.queuedItems === 1 ? "" : "s"}`);

  if (goalLines) {
    blocks.push(`\nActive Goals\n${goalLines}`);
  }

  if (top) {
    blocks.push(
      `\nMost valuable opportunity:\n${top.title}\nEstimated value: $${top.estimatedValue.toLocaleString()}`,
    );
  }

  return blocks.join("\n");
}

export function buildMorningBriefing(ctx: AiosContextPacket): MorningBriefing {
  const variant = briefingVariant(ctx.currentSession, ctx.newActivity);
  const estimatedValue =
    ctx.opportunitySummary.opportunities.reduce((sum, o) => sum + o.estimatedValue, 0) ||
    ctx.revenueSummary.potentialRevenue;

  if (variant === "skip") {
    return {
      summary: "",
      opportunities: [],
      recommendations: [],
      estimatedValue: 0,
      followUpPrompt: "",
      variant: "skip",
    };
  }

  const jenny = operatorFirstName(ctx);
  const phase5Body = buildPhase5Summary(ctx, jenny);

  if (variant === "abbreviated") {
    return {
      summary: `Hope your day is going well.\n\n${phase5Body}`,
      opportunities: ctx.opportunities.slice(0, 2),
      recommendations: ctx.recommendations.slice(0, 2).map((r) => r.message),
      estimatedValue,
      followUpPrompt: "What would you like to work on today?",
      variant: "abbreviated",
      showSunGreeting: false,
    };
  }

  if (variant === "activity-only") {
    return {
      summary: phase5Body,
      opportunities: ctx.opportunities.slice(0, 3),
      recommendations: ctx.recommendations.slice(0, 3).map((r) => r.message),
      estimatedValue,
      followUpPrompt: "What would you like to work on today?",
      variant: "activity-only",
      showSunGreeting: false,
    };
  }

  return {
    greeting: `🌞 Good Morning ${jenny}.`,
    summary: phase5Body,
    opportunities: ctx.opportunities,
    recommendations: ctx.recommendations.map((r) => r.message),
    estimatedValue,
    followUpPrompt: "What would you like to work on today?",
    variant: "full",
    showSunGreeting: true,
  };
}
