import type { AiosContextPacket } from "@/lib/taikos/types";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { VmbSalonWorkspace } from "@/types/vmb/workspace";
import { buildClientOpportunities, type ClientOpportunityRow } from "@/lib/vmb/client-opportunities";
import type { TaikosOpportunity } from "@/lib/taikos/opportunities/types";
import { mapCodaActionToType } from "./action-engine";
import { buildTaikosContext } from "./context-engine";
import { runDiscoveryEngine, type DiscoveryHit } from "./discovery-engine";
import { buildTaikosObjective } from "./objective-engine";
import { searchClientIndex } from "./client-search";
import type { CodaSearchResult, CodaSummary, TaikosContext, TaikosInsight, TaikosObjective } from "./types";

export type BuildInsightInput = {
  context: TaikosContext;
  objective: TaikosObjective;
  hit: DiscoveryHit;
  opportunityId?: string;
};

export function buildInsight(input: BuildInsightInput): TaikosInsight {
  const { context, objective, hit, opportunityId } = input;
  const subjectId = hit.row.id;

  return {
    id: `insight-${hit.ruleId}-${subjectId}`,
    subjectId,
    subjectName: hit.row.clientName,
    subjectLabel: hit.subjectLabel,
    objective: objective.label,
    discovery: hit.discovery,
    curiosityPrompt: hit.curiosityPrompt,
    suggestedAction: hit.suggestedAction,
    actionType: mapCodaActionToType(hit.suggestedAction),
    confidence: hit.confidence,
    opportunityId,
  };
}

function matchOpportunityForRow(
  row: ClientOpportunityRow,
  opportunities: TaikosOpportunity[],
): TaikosOpportunity | undefined {
  const name = row.clientName.trim().toLowerCase();
  return opportunities.find((o) => o.recommendation.toLowerCase().includes(name.split(/\s+/)[0]));
}

export function buildCodaSummary(
  ctx: AiosContextPacket,
  analysis?: VmbBookAnalysisResult,
  workspace?: VmbSalonWorkspace,
): CodaSummary {
  const context = buildTaikosContext(ctx, workspace);
  const objective = buildTaikosObjective(context, ctx);
  const clientRows = analysis ? buildClientOpportunities(analysis).rows : [];
  const hits = runDiscoveryEngine(clientRows, objective, analysis);
  const opportunities = ctx.opportunitySummary.opportunities;

  const insights = hits.slice(0, 8).map((hit) => {
    const matched = matchOpportunityForRow(hit.row, opportunities);
    return buildInsight({
      context,
      objective,
      hit,
      opportunityId: matched?.opportunityId,
    });
  });

  return {
    context,
    objective,
    insights,
    insightCount: insights.length,
    opportunityCount: ctx.opportunitySummary.totalOpportunities,
  };
}

export function runCodaSearch(
  query: string,
  ctx: AiosContextPacket,
  analysis?: VmbBookAnalysisResult,
  insights: TaikosInsight[] = [],
): CodaSearchResult {
  const rows = analysis ? buildClientOpportunities(analysis).rows : [];
  return searchClientIndex(query, rows, insights);
}

export function insightForOpportunity(
  opportunity: TaikosOpportunity,
  insights: TaikosInsight[],
): TaikosInsight | undefined {
  const linked = insights.find((i) => i.opportunityId === opportunity.opportunityId);
  if (linked) return linked;

  const titleToken = opportunity.title.toLowerCase();
  return insights.find((i) => {
    const first = i.subjectName.split(/\s+/)[0]?.toLowerCase();
    return first && opportunity.recommendation.toLowerCase().includes(first);
  }) ?? insights.find((i) => titleToken.includes(i.subjectLabel.toLowerCase()));
}
