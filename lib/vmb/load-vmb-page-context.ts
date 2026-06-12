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
  refreshDue: boolean;
  salonName: string;
  providerPlatform?: VmbProviderPlatform;
  hasSession: boolean;
};

const EMPTY_CONTEXT: VmbPageContext = {
  hasCompletedFirstIngest: false,
  refreshDue: false,
  salonName: "Your Salon",
  hasSession: false,
};

export type LoadVmbPageContextInput = {
  /** ?analysis= from route searchParams */
  analysisId?: string;
};

/**
 * Canonical server loader for salon app pages.
 * Resolves: cookie → workspace → active analysis → view context.
 */
export async function loadVmbPageContext(
  input: LoadVmbPageContextInput = {},
): Promise<VmbPageContext> {
  const cookieStore = await cookies();
  const trialId = cookieStore.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) return { ...EMPTY_CONTEXT };

  const workspace = await getWorkspaceForTrial(trialId);
  const activeBookPointer = await getActiveBookPointer(trialId);
  const resolved = await getActiveVmbAnalysis(trialId, { queryId: input.analysisId?.trim() });
  const activeAnalysisId =
    resolved.analysisId ??
    activeBookPointer?.analysisId ??
    workspaceLatestAnalysisId(workspace);
  let activeAnalysis = activeAnalysisId
    ? await getVmbBookAnalysisForTrial(activeAnalysisId, trialId)
    : undefined;
  if (!activeAnalysis && activeAnalysisId && activeBookPointer?.salonId === trialId) {
    const loose = await getVmbBookAnalysis(activeAnalysisId);
    if (loose && (!loose.trialId || loose.trialId === trialId)) {
      activeAnalysis = loose;
    }
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

  logVmbFlow("today loader resolved", {
    trialId,
    salonId: trialId,
    workspaceId: trialId,
    analysisId: activeAnalysis?.analysisId ?? activeAnalysisId,
    recordCount: activeAnalysis?.recordCount ?? 0,
    clientCount: activeAnalysis?.recordCount ?? 0,
    hasCompletedFirstIngest,
    wouldUnlockToday: hasCompletedFirstIngest,
  });

  return {
    trialId,
    workspace: workspace ?? undefined,
    activeAnalysis,
    activeAnalysisId: activeAnalysis?.analysisId ?? activeAnalysisId,
    hasCompletedFirstIngest,
    refreshDue: workspace ? isRefreshDue(workspace) : false,
    salonName,
    providerPlatform: workspace?.providerPlatform ?? activeAnalysis?.providerPlatform,
    hasSession: true,
  };
}
