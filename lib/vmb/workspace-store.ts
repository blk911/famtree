import type { UpsertWorkspaceInput, VmbSalonWorkspace } from "@/types/vmb/workspace";
import { getVmbWorkspacesFile } from "./paths";
import { readJsonArray, writeJsonArray } from "./runtime-json-store";

const REFRESH_INTERVAL_DAYS = 14;

function isWorkspace(item: unknown): item is VmbSalonWorkspace {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as VmbSalonWorkspace).trialId === "string" &&
    Array.isArray((item as VmbSalonWorkspace).analysisIds)
  );
}

function refreshDueAtFrom(now: Date): string {
  const next = new Date(now);
  next.setDate(next.getDate() + REFRESH_INTERVAL_DAYS);
  return next.toISOString();
}

export async function listWorkspaces(): Promise<VmbSalonWorkspace[]> {
  return readJsonArray(getVmbWorkspacesFile(), isWorkspace);
}

export async function getWorkspaceForTrial(
  trialId: string,
): Promise<VmbSalonWorkspace | undefined> {
  const id = trialId.trim();
  if (!id) return undefined;
  const all = await listWorkspaces();
  return all.find((w) => w.trialId === id);
}

export async function upsertWorkspaceForTrial(
  input: UpsertWorkspaceInput,
): Promise<{ workspace: VmbSalonWorkspace } | { error: string }> {
  const trialId = input.trialId.trim();
  if (!trialId) return { error: "trialId is required" };

  const now = new Date().toISOString();
  const all = await listWorkspaces();
  const index = all.findIndex((w) => w.trialId === trialId);
  const existing = index >= 0 ? all[index] : undefined;

  const workspace: VmbSalonWorkspace = {
    trialId,
    salonName: input.salonName.trim() || existing?.salonName || "Your Salon",
    ownerName: input.ownerName?.trim() || existing?.ownerName,
    email: input.email?.trim() || existing?.email,
    providerPlatform: input.providerPlatform ?? existing?.providerPlatform,
    firstIngestCompleted: existing?.firstIngestCompleted ?? false,
    latestAnalysisId: existing?.latestAnalysisId,
    analysisIds: existing?.analysisIds ?? [],
    lastIngestAt: existing?.lastIngestAt,
    nextRefreshDueAt: existing?.nextRefreshDueAt,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (index >= 0) {
    all[index] = workspace;
  } else {
    all.unshift(workspace);
  }

  const err = await writeJsonArray(getVmbWorkspacesFile(), all);
  if (err) return { error: err };
  return { workspace };
}

export async function markFirstIngestComplete(
  trialId: string,
): Promise<{ workspace: VmbSalonWorkspace } | { error: string }> {
  const all = await listWorkspaces();
  const index = all.findIndex((w) => w.trialId === trialId);
  if (index < 0) return { error: "Workspace not found" };

  const now = new Date().toISOString();
  const workspace: VmbSalonWorkspace = {
    ...all[index],
    firstIngestCompleted: true,
    updatedAt: now,
  };
  all[index] = workspace;

  const err = await writeJsonArray(getVmbWorkspacesFile(), all);
  if (err) return { error: err };
  return { workspace };
}

export async function setLatestAnalysis(
  trialId: string,
  analysisId: string,
): Promise<{ workspace: VmbSalonWorkspace } | { error: string }> {
  const id = analysisId.trim();
  if (!id) return { error: "analysisId is required" };

  const all = await listWorkspaces();
  const index = all.findIndex((w) => w.trialId === trialId);
  if (index < 0) return { error: "Workspace not found" };

  const now = new Date();
  const existing = all[index];
  const analysisIds = existing.analysisIds.includes(id)
    ? existing.analysisIds
    : [...existing.analysisIds, id];

  const workspace: VmbSalonWorkspace = {
    ...existing,
    firstIngestCompleted: true,
    latestAnalysisId: id,
    analysisIds,
    lastIngestAt: now.toISOString(),
    nextRefreshDueAt: refreshDueAtFrom(now),
    updatedAt: now.toISOString(),
  };
  all[index] = workspace;

  const err = await writeJsonArray(getVmbWorkspacesFile(), all);
  if (err) return { error: err };
  return { workspace };
}

export { isRefreshDue, workspaceLatestAnalysisId } from "./workspace-lifecycle";
