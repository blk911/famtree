import { answerMockQuestion } from "@/lib/taikos/adapters/mock-questions";
import { hasLoadedBookData } from "@/lib/taikos/context/has-loaded-book";
import { buildMorningBriefing } from "@/lib/taikos/orchestrator/morning-briefing";
import type { AiosAction, AiosResponse, GenerateAiosInput } from "@/lib/taikos/types";

function baseResponse(
  partial: Omit<AiosResponse, "recommendedActions"> & { recommendedActions?: AiosAction[] },
): AiosResponse {
  const recommendedActions =
    partial.recommendedActions ??
    partial.cards.flatMap((c) => c.actions ?? []).slice(0, 4);
  return {
    showQuestionInput: true,
    layout: "center-panel",
    collapseAfterSeconds: 30,
    ...partial,
    recommendedActions,
  };
}

/** Deterministic adapter — no external LLM. */
export async function mockAiosAdapter(input: GenerateAiosInput): Promise<AiosResponse> {
  const { context, mode, question } = input;

  if (mode === "question" && question?.trim()) {
    return baseResponse(answerMockQuestion(context, question));
  }

  if (mode === "page-assistant") {
    const bookLoaded = hasLoadedBookData(context);
    const intro = bookLoaded
      ? context.currentPage.assistantIntro
      : "Complete Find The Money to load your client book, then I can guide today's moves.";
    return baseResponse({
      mode: "page-assistant",
      message: intro,
      summary: intro,
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
      recommendedActions: context.currentPage.availableActions,
      estimatedValue: context.revenueSummary.potentialRevenue,
      pageContextLine: intro,
      pageContext: context.currentPage,
      followUpPrompt: "Ask tAIkOS anything about this page.",
    });
  }

  if (mode === "idle-summary") {
    return baseResponse({
      mode: "idle-summary",
      message: "Here's a quick summary of your week.\nIf anything changes, let's talk.",
      summary: "Here's a quick summary of your week.\nIf anything changes, let's talk.",
      showQuestionInput: false,
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
      collapseAfterSeconds: 3,
    });
  }

  const briefing = buildMorningBriefing(context);
  if (briefing.variant === "skip") {
    return baseResponse({
      mode: "page-assistant",
      message: context.currentPage.assistantIntro,
      summary: context.currentPage.assistantIntro,
      cards: [],
      opportunities: [],
      recommendations: [],
      estimatedValue: 0,
      pageContextLine: context.currentPage.assistantIntro,
      pageContext: context.currentPage,
    });
  }

  return baseResponse({
    mode: "briefing",
    greeting: briefing.greeting,
    message: briefing.summary,
    summary: briefing.summary,
    cards: [
      {
        id: "morning-briefing",
        title: briefing.greeting ?? "Your briefing",
        body: briefing.summary,
        opportunities: briefing.opportunities,
        actions: context.currentPage.availableActions.slice(0, 3),
      },
      ...briefing.opportunities.slice(0, 4).map((o) => ({
        id: o.id,
        title: o.title,
        body: o.description,
        meta: o.estimatedValue > 0 ? `+$${o.estimatedValue.toLocaleString()}` : undefined,
      })),
    ],
    opportunities: briefing.opportunities,
    recommendations: briefing.recommendations,
    recommendedActions: context.currentPage.availableActions.slice(0, 4),
    estimatedValue: briefing.estimatedValue,
    followUpPrompt: briefing.followUpPrompt,
    showQuestionInput: true,
  });
}
