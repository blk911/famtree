import type { VmbSalonWorkspace } from "@/types/vmb/workspace";

export function isRefreshDue(workspace: VmbSalonWorkspace, now = new Date()): boolean {
  if (!workspace.firstIngestCompleted || !workspace.nextRefreshDueAt) return false;
  const due = Date.parse(workspace.nextRefreshDueAt);
  if (Number.isNaN(due)) return false;
  return now.getTime() >= due;
}

export function workspaceLatestAnalysisId(
  workspace: VmbSalonWorkspace | undefined,
): string | undefined {
  if (!workspace?.firstIngestCompleted || !workspace.latestAnalysisId) return undefined;
  return workspace.latestAnalysisId;
}
