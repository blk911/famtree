import { cookies } from "next/headers";
import { getActiveBookPointer } from "@/lib/vmb/active-book-pointer";
import { getActiveVmbAnalysis } from "@/lib/vmb/active-analysis-resolver";
import { logVmbFlow } from "@/lib/vmb/flow-log";
import { isVmbProcessComplete } from "@/lib/vmb/process-complete";
import { getVmbBookAnalysis, getVmbBookAnalysisForTrial } from "@/lib/vmb/book-analysis/analysis-store";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";
import { isRefreshDue, workspaceLatestAnalysisId } from "@/lib/vmb/workspace-lifecycle";
import { getWorkspaceForTrial } from "@/lib/vmb/workspace-store";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { VmbSalonWorkspace } from "@/types/vmb/workspace";
import type { VmbProviderPlatform } from "@/types/vmb/trial";

export type VmbPageContext = {
  trialId?: string;
  workspace?: VmbSalonWorkspace;
  activeAnalysis?: VmbBookAnalysisResult;
  activeAnalysisId?: string;
  hasCompletedFirstIngest: boolean;
  /** Dev trace — same predicate as hasCompletedFirstIngest */
  wouldUnlockToday: boolean;
  lockReason: string | null;
  refreshDue: boolean;
  salonName: string;
  providerPlatform?: VmbProviderPlatform;
  hasSession: boolean;
};

const EMPTY_CONTEXT: VmbPageContext = {
  hasCompletedFirstIngest: false,
  wouldUnlockToday: false,
  lockReason: "NO_TRIAL_SESSION",
  refreshDue: false,
  salonName: "Your Salon",
  hasSession: false,
};

export type LoadVmbPageContextInput = {
  /** ?analysis= from route searchParams */
  analysisId?: string;
};

function computeLockReason(input: {
  trialId?: string;
  workspace?: VmbSalonWorkspace;
  activeAnalysis?: VmbBookAnalysisResult;
  activeAnalysisId?: string;
  hasCompletedFirstIngest: boolean;
  queryAnalysisId?: string;
}): string | null {
  if (input.hasCompletedFirstIngest) return null;
  if (!input.trialId) {
    if (input.queryAnalysisId) return "NO_TRIAL_SESSION_QUERY_ANALYSIS_UNRESOLVED";
    return "NO_TRIAL_SESSION";
  }
  if (!input.workspace) {
    if (input.activeAnalysis || input.queryAnalysisId) return "WORKSPACE_MISSING_BUT_DATA_EXISTS";
    return "WORKSPACE_MISSING";
  }
  if (input.activeAnalysis && !input.workspace.latestAnalysisId) {
    return "ANALYSIS_NOT_LINKED_IN_WORKSPACE";
  }
  if (
    input.workspace.latestAnalysisId &&
    input.activeAnalysisId &&
    input.workspace.latestAnalysisId !== input.activeAnalysisId
  ) {
    return "WORKSPACE_ANALYSIS_ID_MISMATCH";
  }
  return "PROCESS_NOT_COMPLETE";
}

async function resolveAnalysisForTrial(
  analysisId: string,
  trialId: string,
): Promise<VmbBookAnalysisResult | undefined> {
  const id = analysisId.trim();
  if (!id) return undefined;
  const scoped = await getVmbBookAnalysisForTrial(id, trialId);
  if (scoped) return scoped;
  const loose = await getVmbBookAnalysis(id);
  if (loose && (!loose.trialId || loose.trialId === trialId)) return loose;
  return undefined;
}

/**
 * Canonical server loader for salon app pages.
 * Resolves: cookie → workspace → active analysis → view context.
 */
export async function loadVmbPageContext(
  input: LoadVmbPageContextInput = {},
): Promise<VmbPageContext> {
  const cookieStore = await cookies();
  const queryAnalysisId = input.analysisId?.trim();
  let trialId = cookieStore.get(VMB_TRIAL_COOKIE)?.value?.trim();

  if (queryAnalysisId) {
    const queryAnalysis = await getVmbBookAnalysis(queryAnalysisId);
    const analysisTrialId = queryAnalysis?.trialId?.trim();
    if (analysisTrialId && (!trialId || trialId !== analysisTrialId)) {
      trialId = analysisTrialId;
    }
  } else if (!trialId && queryAnalysisId) {
    const queryAnalysis = await getVmbBookAnalysis(queryAnalysisId);
    if (queryAnalysis?.trialId?.trim()) {
      trialId = queryAnalysis.trialId.trim();
    }
  }

  if (!trialId) {
    if (queryAnalysisId) {
      const queryAnalysis = await getVmbBookAnalysis(queryAnalysisId);
      const hasCompletedFirstIngest = isVmbProcessComplete({
        activeAnalysis: queryAnalysis,
        activeAnalysisId: queryAnalysisId,
      });
      const lockReason = computeLockReason({
        activeAnalysis: queryAnalysis,
        activeAnalysisId: queryAnalysisId,
        hasCompletedFirstIngest,
        queryAnalysisId,
      });
      logVmbFlow("today loader resolved", {
        analysisId: queryAnalysisId,
        recordCount: queryAnalysis?.recordCount ?? 0,
        clientCount: queryAnalysis?.recordCount ?? 0,
        hasCompletedFirstIngest,
        wouldUnlockToday: hasCompletedFirstIngest,
        lockReason,
        noTrialCookie: true,
      });
      return {
        trialId: queryAnalysis?.trialId,
        activeAnalysis: queryAnalysis,
        activeAnalysisId: queryAnalysisId,
        hasCompletedFirstIngest,
        wouldUnlockToday: hasCompletedFirstIngest,
        lockReason,
        refreshDue: false,
        salonName: queryAnalysis?.salonName?.trim() ?? EMPTY_CONTEXT.salonName,
        providerPlatform: queryAnalysis?.providerPlatform,
        hasSession: false,
      };
    }
    return { ...EMPTY_CONTEXT };
  }

  const workspace = await getWorkspaceForTrial(trialId);
  const activeBookPointer = await getActiveBookPointer(trialId);
  const resolved = await getActiveVmbAnalysis(trialId, { queryId: queryAnalysisId });
  let activeAnalysisId =
    resolved.analysisId ??
    queryAnalysisId ??
    activeBookPointer?.analysisId ??
    workspaceLatestAnalysisId(workspace);

  let activeAnalysis = activeAnalysisId
    ? await resolveAnalysisForTrial(activeAnalysisId, trialId)
    : undefined;

  if (!activeAnalysis && queryAnalysisId && queryAnalysisId !== activeAnalysisId) {
    activeAnalysis = await resolveAnalysisForTrial(queryAnalysisId, trialId);
    if (activeAnalysis) activeAnalysisId = activeAnalysis.analysisId;
  }

  const salonName =
    workspace?.salonName?.trim() ||
    activeAnalysis?.salonName?.trim() ||
    EMPTY_CONTEXT.salonName;

  const hasCompletedFirstIngest = isVmbProcessComplete({
    workspace,
    activeAnalysis,
    activeAnalysisId: activeAnalysis?.analysisId ?? activeAnalysisId,
    activeBookPointer,
    trialId,
  });

  const lockReason = computeLockReason({
    trialId,
    workspace,
    activeAnalysis,
    activeAnalysisId: activeAnalysis?.analysisId ?? activeAnalysisId,
    hasCompletedFirstIngest,
    queryAnalysisId,
  });

  logVmbFlow("today loader resolved", {
    trialId,
    salonId: trialId,
    workspaceId: trialId,
    analysisId: activeAnalysis?.analysisId ?? activeAnalysisId,
    recordCount: activeAnalysis?.recordCount ?? 0,
    clientCount: activeAnalysis?.recordCount ?? 0,
    hasCompletedFirstIngest,
    wouldUnlockToday: hasCompletedFirstIngest,
    lockReason,
    queryAnalysisId,
  });

  return {
    trialId,
    workspace: workspace ?? undefined,
    activeAnalysis,
    activeAnalysisId: activeAnalysis?.analysisId ?? activeAnalysisId,
    hasCompletedFirstIngest,
    wouldUnlockToday: hasCompletedFirstIngest,
    lockReason,
    refreshDue: workspace ? isRefreshDue(workspace) : false,
    salonName,
    providerPlatform: workspace?.providerPlatform ?? activeAnalysis?.providerPlatform,
    hasSession: true,
  };
}
