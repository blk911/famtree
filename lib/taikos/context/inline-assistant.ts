import type { AiosContextPacket } from "@/lib/taikos/types";

export type InlineAssistantView = {
  intro: string;
  objective?: string;
  recommendations: string[];
  potentialValue: number;
};

/** Props-only assistant copy — no network fetch. */
export function buildInlineAssistantView(ctx: AiosContextPacket): InlineAssistantView {
  return {
    intro: ctx.currentPage.assistantIntro?.trim() || "Here's what stands out from your book this week.",
    objective: ctx.codaSummary?.objective?.label,
    recommendations: ctx.recommendations.slice(0, 4).map((r) => r.message),
    potentialValue: ctx.revenueSummary.potentialRevenue,
  };
}
