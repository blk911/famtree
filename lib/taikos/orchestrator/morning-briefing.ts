import { briefingVariant } from "@/lib/taikos/session/session-manager";
import type { AiosContextPacket, MorningBriefing } from "@/lib/taikos/types";

function formatCurrency(value: number): string {
  return `+$${value.toLocaleString()}`;
}

function operatorFirstName(ctx: AiosContextPacket): string {
  const raw = ctx.operatorName ?? ctx.salonName;
  return raw.trim().split(/\s+/)[0] || "there";
}

function buildSinceLastVisitLines(ctx: AiosContextPacket): string[] {
  const lines: string[] = [];

  if (ctx.pcnSummary.membersJoined > 0) {
    lines.push(
      `${ctx.pcnSummary.membersJoined} PCN member${ctx.pcnSummary.membersJoined === 1 ? "" : "s"} joined.`,
    );
  }

  const referralOpp = ctx.opportunities.find((o) => o.sourceRule === "referral");
  if (referralOpp) {
    const match = referralOpp.description.match(/(\d+)/);
    const count = match ? Number.parseInt(match[1], 10) : 1;
    if (count > 0) {
      lines.push(`${count} client${count === 1 ? "" : "s"} can refer new business.`);
    }
  }

  const birthdayOpp = ctx.opportunities.find((o) => o.sourceRule === "birthday");
  if (birthdayOpp) {
    lines.push(birthdayOpp.description.replace(/\.$/, "") + ".");
  }

  if (ctx.calendarSummary.openSlots > 0) {
    lines.push(
      `You have ${ctx.calendarSummary.openSlots} open appointment opportunit${ctx.calendarSummary.openSlots === 1 ? "y" : "ies"}.`,
    );
  }

  if (ctx.clientSummary.overdueClients > 0) {
    lines.push(`${ctx.clientSummary.overdueClients} clients are overdue for a visit.`);
  }

  if (ctx.revenueSummary.touchesReady > 0) {
    lines.push(`${ctx.revenueSummary.touchesReady} revenue touches are ready.`);
  }

  if (lines.length === 0 && ctx.pcnSummary.invitesReady > 0) {
    lines.push(`${ctx.pcnSummary.invitesReady} network invites are ready to preview.`);
  }

  return lines;
}

export function buildMorningBriefing(ctx: AiosContextPacket): MorningBriefing {
  const variant = briefingVariant(ctx.currentSession, ctx.newActivity);
  const estimatedValue =
    ctx.opportunities.reduce((sum, o) => sum + o.estimatedValue, 0) ||
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

  const lines = buildSinceLastVisitLines(ctx);
  const jenny = operatorFirstName(ctx);

  if (variant === "abbreviated") {
    const summary = ctx.newActivity
      ? lines.length > 0
        ? lines.join(" ")
        : "A few new signals appeared since your last check-in."
      : "No major changes since your last check-in.";

    return {
      summary: `Hope your day is going well.\n${summary}`,
      opportunities: ctx.opportunities.slice(0, 2),
      recommendations: ctx.recommendations.slice(0, 2).map((r) => r.message),
      estimatedValue,
      followUpPrompt: "Anything you want me to work on?",
      variant: "abbreviated",
      showSunGreeting: false,
    };
  }

  if (variant === "activity-only") {
    const summary =
      lines.length > 0 ? lines.join(" ") : "No new activity since your last visit.";
    return {
      summary: ctx.currentSession.briefingShownToday
        ? `Here's what's new:\n${summary}`
        : summary,
      opportunities: ctx.opportunities.slice(0, 3),
      recommendations: ctx.recommendations.slice(0, 3).map((r) => r.message),
      estimatedValue,
      followUpPrompt: "What would you like to tackle?",
      variant: "activity-only",
      showSunGreeting: false,
    };
  }

  const sinceBlock =
    lines.length > 0
      ? lines.map((l) => `• ${l}`).join("\n")
      : "Your book is connected and ready.";

  const valueLine =
    estimatedValue > 0 ? `\n\nEstimated opportunity value:\n${formatCurrency(estimatedValue)}` : "";

  return {
    greeting: `🌞 Good Morning ${jenny}.`,
    summary: `Here's what happened since your last visit.\n\n${sinceBlock}${valueLine}`,
    opportunities: ctx.opportunities,
    recommendations: ctx.recommendations.map((r) => r.message),
    estimatedValue,
    followUpPrompt: "What are you working on today?",
    variant: "full",
    showSunGreeting: true,
  };
}
