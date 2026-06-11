import { greetingForOperator } from "@/lib/taikos/context/context-builder";
import { briefingVariant } from "@/lib/taikos/session/session-manager";
import type { AiosContextPacket, MorningBriefing } from "@/lib/taikos/types";

function formatCurrency(value: number): string {
  return `+$${value.toLocaleString()}`;
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
      greeting: greetingForOperator(ctx.salonName),
      summary: "",
      opportunities: [],
      recommendations: [],
      estimatedValue: 0,
      followUpPrompt: "",
      variant: "skip",
    };
  }

  const greeting = greetingForOperator(ctx.salonName);
  const lines = buildSinceLastVisitLines(ctx);

  if (variant === "abbreviated") {
    const summary =
      lines.length > 0
        ? `Quick update: ${lines[0]}`
        : `${ctx.clientSummary.totalClients} clients in your book.`;
    return {
      greeting,
      summary,
      opportunities: ctx.opportunities.slice(0, 2),
      recommendations: ctx.recommendations.slice(0, 2).map((r) => r.message),
      estimatedValue,
      followUpPrompt: "What are you working on today?",
      variant: "abbreviated",
    };
  }

  if (variant === "activity-only") {
    const summary = lines.length > 0 ? lines.join(" ") : "No new activity since your last visit.";
    return {
      greeting,
      summary,
      opportunities: ctx.opportunities.slice(0, 3),
      recommendations: ctx.recommendations.slice(0, 3).map((r) => r.message),
      estimatedValue,
      followUpPrompt: "What would you like to tackle?",
      variant: "activity-only",
    };
  }

  const sinceBlock =
    lines.length > 0 ? `Since your last visit:\n${lines.map((l) => `• ${l}`).join("\n")}` : "Your book is connected.";

  const valueLine =
    estimatedValue > 0
      ? `\n\nEstimated opportunity value:\n${formatCurrency(estimatedValue)}`
      : "";

  return {
    greeting,
    summary: `${sinceBlock}${valueLine}`,
    opportunities: ctx.opportunities,
    recommendations: ctx.recommendations.map((r) => r.message),
    estimatedValue,
    followUpPrompt: "What are you working on today?",
    variant: "full",
  };
}
