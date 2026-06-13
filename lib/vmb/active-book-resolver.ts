import { getActiveBookPointer } from "@/lib/vmb/active-book-pointer";
import {
  getLatestVmbBookAnalysisForTrial,
  getVmbBookAnalysis,
  getVmbBookAnalysisForTrial,
} from "@/lib/vmb/book-analysis/analysis-store";
import { workspaceLatestAnalysisId } from "@/lib/vmb/workspace-lifecycle";
import { getWorkspaceForTrial } from "@/lib/vmb/workspace-store";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

export type ActiveBookResolutionSource =
  | "query"
  | "workspace"
  | "active_pointer"
  | "latest_analysis"
  | "none";

export type ActiveBookResolution = {
  hasActiveBook: boolean;
  analysisId?: string;
  clientCount?: number;
  recordCount?: number;
  updatedAt?: string;
  source: ActiveBookResolutionSource;
};

export type ResolveActiveBookInput = {
  /** ?analysis= from route or explicit id */
  queryId?: string;
  /** sessionStorage active analysis id (client) */
  sessionId?: string;
};

export type ResolvedActiveBook = ActiveBookResolution & {
  analysis?: VmbBookAnalysisResult;
};

async function tryLoadAnalysisForTrial(
  trialId: string,
  analysisId: string,
): Promise<VmbBookAnalysisResult | undefined> {
  const id = analysisId.trim();
  if (!id) return undefined;
  const scoped = await getVmbBookAnalysisForTrial(id, trialId);
  if (scoped) return scoped;
  const loose = await getVmbBookAnalysis(id);
  if (loose && (!loose.trialId || loose.trialId === trialId)) return loose;
  return undefined;
}

function buildResolution(
  source: ActiveBookResolutionSource,
  analysis: VmbBookAnalysisResult | undefined,
  pointer?: { clientCount: number; recordCount: number; updatedAt: string } | null,
): ActiveBookResolution {
  if (!analysis?.analysisId) {
    return { hasActiveBook: false, source: "none" };
  }
  return {
    hasActiveBook: true,
    analysisId: analysis.analysisId,
    clientCount: pointer?.clientCount ?? analysis.recordCount,
    recordCount: analysis.recordCount,
    updatedAt: pointer?.updatedAt ?? analysis.generatedAt,
    source,
  };
}

/**
 * Canonical active book resolver for all VMB modules.
 * Priority: query → session → workspace.latestAnalysisId → activeBookPointer → latest analysis for trial.
 */
export async function resolveActiveBook(
  trialId: string,
  input: ResolveActiveBookInput = {},
): Promise<ResolvedActiveBook> {
  const trimmedTrialId = trialId.trim();
  if (!trimmedTrialId) {
    return { hasActiveBook: false, source: "none" };
  }

  const queryId = input.queryId?.trim();
  if (queryId) {
    const analysis = await tryLoadAnalysisForTrial(trimmedTrialId, queryId);
    if (analysis) {
      const pointer = await getActiveBookPointer(trimmedTrialId);
      return { ...buildResolution("query", analysis, pointer), analysis };
    }
  }

  const sessionId = input.sessionId?.trim();
  if (sessionId && sessionId !== queryId) {
    const analysis = await tryLoadAnalysisForTrial(trimmedTrialId, sessionId);
    if (analysis) {
      const pointer = await getActiveBookPointer(trimmedTrialId);
      return { ...buildResolution("query", analysis, pointer), analysis };
    }
  }

  const workspace = await getWorkspaceForTrial(trimmedTrialId);
  const workspaceLatestId = workspaceLatestAnalysisId(workspace);
  if (workspaceLatestId) {
    const analysis = await tryLoadAnalysisForTrial(trimmedTrialId, workspaceLatestId);
    if (analysis) {
      const pointer = await getActiveBookPointer(trimmedTrialId);
      return { ...buildResolution("workspace", analysis, pointer), analysis };
    }
  }

  const pointer = await getActiveBookPointer(trimmedTrialId);
  if (pointer?.analysisId) {
    const analysis = await tryLoadAnalysisForTrial(trimmedTrialId, pointer.analysisId);
    if (analysis) {
      return { ...buildResolution("active_pointer", analysis, pointer), analysis };
    }
  }

  const latest = await getLatestVmbBookAnalysisForTrial(trimmedTrialId);
  if (latest) {
    return { ...buildResolution("latest_analysis", latest, pointer), analysis: latest };
  }

  return { hasActiveBook: false, source: "none" };
}
