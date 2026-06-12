import type { UpsertWorkspaceInput, VmbSalonWorkspace } from "@/types/vmb/workspace";
import { logVmbFlow } from "@/lib/vmb/flow-log";
import { resolveVmbStorageBackend } from "@/lib/vmb/db";
import { assertVmbWritableBackend, vmbJsonFallbackAllowed } from "@/lib/vmb/storage-policy";
import {
  getWorkspaceForTrialPostgres,
  saveWorkspacePostgres,
} from "@/lib/vmb/workspace-store-postgres";
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

async function listWorkspacesJson(): Promise<VmbSalonWorkspace[]> {
  return readJsonArray(getVmbWorkspacesFile(), isWorkspace);
}

async function persistWorkspaceJson(workspace: VmbSalonWorkspace): Promise<string | null> {
  const all = await listWorkspacesJson();
  const index = all.findIndex((w) => w.trialId === workspace.trialId);
  if (index >= 0) all[index] = workspace;
  else all.unshift(workspace);
  return writeJsonArray(getVmbWorkspacesFile(), all);
}

async function persistWorkspace(workspace: VmbSalonWorkspace): Promise<string | null> {
  const writable = await assertVmbWritableBackend();
  if (!writable.ok) return writable.error;

  if (writable.backend === "postgres") {
    const err = await saveWorkspacePostgres(workspace);
    if (err) return err;
    if (vmbJsonFallbackAllowed()) {
      await persistWorkspaceJson(workspace);
    }
    return null;
  }

  return persistWorkspaceJson(workspace);
}

export async function listWorkspaces(): Promise<VmbSalonWorkspace[]> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    const { listWorkspacesPostgres } = await import("@/lib/vmb/workspace-store-postgres");
    return listWorkspacesPostgres();
  }
  return listWorkspacesJson();
}

export async function getWorkspaceForTrial(
  trialId: string,
): Promise<VmbSalonWorkspace | undefined> {
  const id = trialId.trim();
  if (!id) return undefined;

  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    return getWorkspaceForTrialPostgres(id);
  }

  const all = await listWorkspacesJson();
  return all.find((w) => w.trialId === id);
}

export async function upsertWorkspaceForTrial(
  input: UpsertWorkspaceInput,
): Promise<{ workspace: VmbSalonWorkspace } | { error: string }> {
  const trialId = input.trialId.trim();
  if (!trialId) return { error: "trialId is required" };

  const now = new Date().toISOString();
  const existing = await getWorkspaceForTrial(trialId);

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

  const err = await persistWorkspace(workspace);
  if (err) return { error: err };
  return { workspace };
}

export async function markFirstIngestComplete(
  trialId: string,
): Promise<{ workspace: VmbSalonWorkspace } | { error: string }> {
  const existing = await getWorkspaceForTrial(trialId);
  if (!existing) return { error: "Workspace not found" };

  const now = new Date().toISOString();
  const workspace: VmbSalonWorkspace = {
    ...existing,
    firstIngestCompleted: true,
    updatedAt: now,
  };

  const err = await persistWorkspace(workspace);
  if (err) return { error: err };
  return { workspace };
}

export async function setLatestAnalysis(
  trialId: string,
  analysisId: string,
): Promise<{ workspace: VmbSalonWorkspace } | { error: string }> {
  const id = analysisId.trim();
  if (!id) return { error: "analysisId is required" };

  let existing = await getWorkspaceForTrial(trialId);
  if (!existing) {
    const created = await upsertWorkspaceForTrial({ trialId, salonName: "Your Salon" });
    if ("error" in created) return { error: created.error };
    existing = created.workspace;
  }

  const now = new Date();
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

  const err = await persistWorkspace(workspace);
  if (err) return { error: err };

  logVmbFlow("workspace updated", {
    trialId,
    salonId: trialId,
    workspaceId: trialId,
    analysisId: id,
    recordCount: workspace.analysisIds.length,
    clientCount: workspace.analysisIds.length,
    firstIngestCompleted: workspace.firstIngestCompleted,
    latestAnalysisId: workspace.latestAnalysisId,
  });

  return { workspace };
}

export { isRefreshDue, workspaceLatestAnalysisId } from "./workspace-lifecycle";
