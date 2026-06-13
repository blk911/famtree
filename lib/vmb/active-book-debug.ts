import { getActiveBookPointer } from "@/lib/vmb/active-book-pointer";
import { resolveActiveBook, type ResolvedActiveBook } from "@/lib/vmb/active-book-resolver";
import {
  getLatestVmbBookAnalysisForTrial,
  getVmbBookAnalysis,
} from "@/lib/vmb/book-analysis/analysis-store";
import { getWorkspaceForTrial } from "@/lib/vmb/workspace-store";
import type { VmbSalonWorkspace } from "@/types/vmb/workspace";

export type ActiveBookDebugPayload = {
  hasActiveBook: boolean;
  analysisId?: string;
  clientCount?: number;
  recordCount?: number;
  updatedAt?: string;
  source: string;
  workspace: {
    trialId?: string;
    salonId?: string;
    firstIngestCompleted: boolean;
    latestAnalysisId?: string;
    analysisIds: string[];
  };
  activeBookPointer: {
    exists: boolean;
    salonId?: string;
    analysisId?: string;
    clientCount?: number;
    recordCount?: number;
    updatedAt?: string;
  };
  latestAnalysis: {
    exists: boolean;
    analysisId?: string;
    clientCount?: number;
    recordCount?: number;
  };
  cookies: {
    hasTrialCookie: boolean;
    trialId?: string;
  };
};

export type ActiveBookDebugResult = ActiveBookDebugPayload & {
  analysis?: ResolvedActiveBook["analysis"];
};

export async function buildActiveBookDebugPayload(input: {
  trialId?: string;
  hasTrialCookie: boolean;
  cookieTrialId?: string;
  queryId?: string;
  sessionId?: string;
}): Promise<ActiveBookDebugResult> {
  const trialId = input.trialId?.trim();
  const workspace: VmbSalonWorkspace | undefined = trialId
    ? await getWorkspaceForTrial(trialId)
    : undefined;
  const pointer = trialId ? await getActiveBookPointer(trialId) : undefined;
  const latest = trialId ? await getLatestVmbBookAnalysisForTrial(trialId) : undefined;

  const resolved: ResolvedActiveBook = trialId
    ? await resolveActiveBook(trialId, { queryId: input.queryId, sessionId: input.sessionId })
    : { hasActiveBook: false, source: "none" };

  let analysisId = resolved.analysisId;
  let hasActiveBook = resolved.hasActiveBook;
  let analysis = resolved.analysis;

  if (!hasActiveBook && input.queryId?.trim() && !trialId) {
    const loose = await getVmbBookAnalysis(input.queryId.trim());
    if (loose?.analysisId) {
      hasActiveBook = true;
      analysisId = loose.analysisId;
      analysis = loose;
    }
  }

  return {
    hasActiveBook,
    analysisId,
    clientCount: resolved.clientCount ?? pointer?.clientCount ?? latest?.recordCount,
    recordCount: resolved.recordCount ?? pointer?.recordCount ?? latest?.recordCount,
    updatedAt: resolved.updatedAt ?? pointer?.updatedAt ?? latest?.generatedAt,
    source: resolved.source,
    workspace: {
      trialId: workspace?.trialId ?? trialId,
      salonId: workspace?.trialId ?? trialId,
      firstIngestCompleted: workspace?.firstIngestCompleted ?? false,
      latestAnalysisId: workspace?.latestAnalysisId,
      analysisIds: workspace?.analysisIds ?? [],
    },
    activeBookPointer: {
      exists: !!pointer,
      salonId: pointer?.salonId,
      analysisId: pointer?.analysisId,
      clientCount: pointer?.clientCount,
      recordCount: pointer?.recordCount,
      updatedAt: pointer?.updatedAt,
    },
    latestAnalysis: {
      exists: !!latest,
      analysisId: latest?.analysisId,
      clientCount: latest?.recordCount,
      recordCount: latest?.recordCount,
    },
    cookies: {
      hasTrialCookie: input.hasTrialCookie,
      trialId: input.cookieTrialId,
    },
    analysis,
  };
}
