import { getVmbBookAnalysisForTrial } from "@/lib/vmb/book-analysis/analysis-store";
import { workspaceLatestAnalysisId } from "@/lib/vmb/workspace-lifecycle";
import { getWorkspaceForTrial } from "@/lib/vmb/workspace-store";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

export type ActiveVmbAnalysisSource = "query" | "session" | "workspace" | "none";

export type ResolvedActiveVmbAnalysis = {
  analysisId?: string;
  source: ActiveVmbAnalysisSource;
};

export type ActiveVmbAnalysisCandidates = {
  queryId?: string;
  sessionId?: string;
};

async function tryAnalysisForTrial(
  trialId: string,
  analysisId: string,
): Promise<VmbBookAnalysisResult | undefined> {
  const id = analysisId.trim();
  if (!id) return undefined;
  return getVmbBookAnalysisForTrial(id, trialId);
}

/**
 * Canonical server resolver — order: query id → session id → workspace.latestAnalysisId.
 */
export async function getActiveVmbAnalysis(
  trialId: string,
  candidates: ActiveVmbAnalysisCandidates = {},
): Promise<ResolvedActiveVmbAnalysis> {
  const queryId = candidates.queryId?.trim();
  if (queryId) {
    const analysis = await tryAnalysisForTrial(trialId, queryId);
    if (analysis) return { analysisId: analysis.analysisId, source: "query" };
  }

  const sessionId = candidates.sessionId?.trim();
  if (sessionId && sessionId !== queryId) {
    const analysis = await tryAnalysisForTrial(trialId, sessionId);
    if (analysis) return { analysisId: analysis.analysisId, source: "session" };
  }

  const workspace = await getWorkspaceForTrial(trialId);
  const latestId = workspaceLatestAnalysisId(workspace);
  if (latestId) {
    const analysis = await tryAnalysisForTrial(trialId, latestId);
    if (analysis) return { analysisId: analysis.analysisId, source: "workspace" };
  }

  return { source: "none" };
}
