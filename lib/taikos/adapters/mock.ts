import { buildMorningBriefing } from "@/lib/taikos/orchestrator/morning-briefing";
import type { AiosResponse, GenerateAiosInput } from "@/lib/taikos/types";

/** Deterministic adapter — no external LLM. Default for Phase 1. */
export async function mockAiosAdapter(input: GenerateAiosInput): Promise<AiosResponse> {
  const { context, mode, question } = input;

  if (mode === "question" && question?.trim()) {
    return {
      mode: "question",
      summary: `I can help with ${context.currentPage.title.toLowerCase()}. Try reviewing invites or client moves from Home.`,
      cards: [
        {
          id: "question-stub",
          title: "tAIkOS",
          body: `You asked: “${question.trim()}”. Phase 1 routes questions through deterministic context — model adapters come in Phase 2.`,
          actions: context.currentPage.availableActions.slice(0, 2),
        },
      ],
      opportunities: context.opportunities.slice(0, 3),
      recommendations: context.recommendations.slice(0, 3).map((r) => r.message),
      estimatedValue: context.revenueSummary.potentialRevenue,
      pageContextLine: context.currentPage.description,
    };
  }

  if (mode === "page-assistant") {
    const line =
      context.currentPage.pageId === "clients"
        ? "You're viewing clients."
        : context.currentPage.pageId === "network"
          ? "You're viewing your private client network."
          : context.currentPage.pageId === "appointments"
            ? "You're viewing your calendar."
            : context.currentPage.description;

    return {
      mode: "page-assistant",
      summary: line,
      cards: [
        {
          id: "page-assist",
          title: context.currentPage.title,
          body: context.currentPage.description,
          actions: context.currentPage.availableActions,
          opportunities: context.opportunities.slice(0, 2),
        },
      ],
      opportunities: context.opportunities,
      recommendations: context.recommendations.map((r) => r.message),
      estimatedValue: context.revenueSummary.potentialRevenue,
      pageContextLine: line,
      followUpPrompt: "What would you like to do here?",
    };
  }

  if (mode === "idle-summary") {
    return {
      mode: "idle-summary",
      summary: "Here's a quick summary of your week.\nIf anything changes, let's talk.",
      cards: [
        {
          id: "idle-week",
          title: "This week",
          body: `${context.pcnSummary.invitesReady} invites · ${context.revenueSummary.touchesReady} revenue touches · ${context.calendarSummary.openSlots} openings`,
        },
      ],
      opportunities: context.opportunities.slice(0, 2),
      recommendations: [],
      estimatedValue: context.revenueSummary.potentialRevenue,
    };
  }

  const briefing = buildMorningBriefing(context);
  if (briefing.variant === "skip") {
    return {
      mode: "page-assistant",
      summary: context.currentPage.description,
      cards: [],
      opportunities: [],
      recommendations: [],
      estimatedValue: 0,
      pageContextLine: context.currentPage.description,
    };
  }

  return {
    mode: "briefing",
    greeting: briefing.greeting,
    summary: briefing.summary,
    cards: [
      {
        id: "morning-briefing",
        title: briefing.greeting,
        body: briefing.summary,
        opportunities: briefing.opportunities,
        actions: context.currentPage.availableActions.slice(0, 3),
      },
    ],
    opportunities: briefing.opportunities,
    recommendations: briefing.recommendations,
    estimatedValue: briefing.estimatedValue,
    followUpPrompt: briefing.followUpPrompt,
  };
}
