import { promises as fs } from "fs";
import path from "path";
import { restoreActiveBookForSalon } from "@/lib/vmb/active-book-restore";
import { getActiveBookPointer, listActiveBookPointers, setActiveBookPointer } from "@/lib/vmb/active-book-pointer";
import { resolveAdminDemoBookConfig } from "@/lib/vmb/admin-demo-book";
import { getLatestVmbBookAnalysisForTrial, getVmbBookAnalysis, listVmbBookAnalyses } from "@/lib/vmb/book-analysis/analysis-store";
import { isVmbDevOperatorApiEnabled } from "@/lib/vmb/dev-operator-api-guard";
import { listSalonInviteLocalCopies } from "@/lib/vmb/invites/salon-invite-local-copy-store";
import { getVmbDevStateFile } from "@/lib/vmb/paths";
import { getServicesForSalon } from "@/lib/vmb/services/service-store";
import { getTemplatesForSalon } from "@/lib/vmb/card-templates/card-template-store";
import { getWorkspaceForTrial, listWorkspaces, setLatestAnalysis } from "@/lib/vmb/workspace-store";
import type { ActiveBookPointer } from "@/lib/vmb/active-book-pointer-types";
import type { VmbSalonWorkspace } from "@/types/vmb/workspace";

export type VmbDevStateSnapshot = {
  version: 1;
  timestamp: string;
  salonId?: string;
  sessionId?: string;
  latestAnalysisId?: string;
  activeBook?: ActiveBookPointer;
  workspace?: Pick<
    VmbSalonWorkspace,
    | "trialId"
    | "salonName"
    | "ownerName"
    | "email"
    | "providerPlatform"
    | "firstIngestCompleted"
    | "latestAnalysisId"
    | "analysisIds"
    | "lastIngestAt"
    | "nextRefreshDueAt"
  >;
  lastRoute: string;
  selected?: {
    serviceId?: string;
    cardId?: string;
    inviteId?: string;
  };
  counts: {
    clients: number;
    services: number;
    invitations: number;
    cards: number;
    opportunities: number;
  };
};

export function assertVmbDevStateAllowed(): { ok: true } | { ok: false; status: 404; error: string } {
  if (isVmbDevOperatorApiEnabled()) return { ok: true };
  return { ok: false, status: 404, error: "Not available in production" };
}

function normalizeRoute(route?: string): string {
  const trimmed = route?.trim();
  if (!trimmed || !trimmed.startsWith("/vmb")) return "/vmb/start";
  return trimmed;
}

async function readSnapshotFile(): Promise<VmbDevStateSnapshot | null> {
  try {
    const raw = await fs.readFile(getVmbDevStateFile(), "utf8");
    const parsed = JSON.parse(raw) as VmbDevStateSnapshot;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeSnapshotFile(snapshot: VmbDevStateSnapshot): Promise<void> {
  const filePath = getVmbDevStateFile();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf8");
}

async function removeSnapshotFile(): Promise<void> {
  await fs.rm(getVmbDevStateFile(), { force: true });
}

async function findLatestWorkspace(): Promise<VmbSalonWorkspace | undefined> {
  const workspaces = await listWorkspaces();
  return [...workspaces].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

async function findLatestPointer(): Promise<ActiveBookPointer | undefined> {
  const pointers = await listActiveBookPointers();
  return [...pointers].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

async function resolveCaptureContext(input: {
  salonId?: string;
  latestAnalysisId?: string;
}): Promise<{
  salonId?: string;
  latestAnalysisId?: string;
  activeBook?: ActiveBookPointer;
  workspace?: VmbSalonWorkspace;
}> {
  let salonId = input.salonId?.trim();
  let workspace = salonId ? await getWorkspaceForTrial(salonId) : undefined;
  let activeBook = salonId ? await getActiveBookPointer(salonId) : undefined;

  if (!salonId) {
    workspace = await findLatestWorkspace();
    salonId = workspace?.trialId;
  }
  if (!activeBook && salonId) activeBook = await getActiveBookPointer(salonId);
  if (!activeBook) activeBook = await findLatestPointer();
  if (!salonId) salonId = activeBook?.salonId;
  if (!workspace && salonId) workspace = await getWorkspaceForTrial(salonId);

  let latestAnalysisId =
    input.latestAnalysisId?.trim() ||
    workspace?.latestAnalysisId?.trim() ||
    activeBook?.analysisId?.trim();

  if (!latestAnalysisId && salonId) {
    latestAnalysisId = (await getLatestVmbBookAnalysisForTrial(salonId))?.analysisId;
  }
  if (!latestAnalysisId) {
    latestAnalysisId = (await listVmbBookAnalyses())[0]?.analysisId;
  }

  return { salonId, latestAnalysisId, activeBook, workspace };
}

async function summaryCounts(salonId: string | undefined, analysisId: string | undefined): Promise<VmbDevStateSnapshot["counts"]> {
  const analysis = analysisId ? await getVmbBookAnalysis(analysisId) : undefined;
  const services = salonId ? await getServicesForSalon(salonId).catch(() => []) : [];
  const invitations = salonId ? await listSalonInviteLocalCopies(salonId).catch(() => []) : [];
  const cards = salonId ? await getTemplatesForSalon(salonId).catch(() => []) : [];
  return {
    clients: analysis?.recordCount ?? 0,
    services: services.length,
    invitations: invitations.length,
    cards: cards.length,
    opportunities:
      (analysis?.reactivationTargets.length ?? 0) +
      (analysis?.referralOpportunities.length ?? 0) +
      (analysis?.giftOpportunities.length ?? 0) +
      (analysis?.trustedProviderIntroOpportunities.length ?? 0),
  };
}

export async function getVmbDevStateStatus(): Promise<{
  exists: boolean;
  filePath: string;
  snapshot: VmbDevStateSnapshot | null;
}> {
  const snapshot = await readSnapshotFile();
  return { exists: !!snapshot, filePath: getVmbDevStateFile(), snapshot };
}

export async function captureVmbDevState(input: {
  salonId?: string;
  latestAnalysisId?: string;
  sessionId?: string;
  lastRoute?: string;
  selected?: VmbDevStateSnapshot["selected"];
}): Promise<VmbDevStateSnapshot> {
  const context = await resolveCaptureContext(input);
  const counts = await summaryCounts(context.salonId, context.latestAnalysisId);
  const snapshot: VmbDevStateSnapshot = {
    version: 1,
    timestamp: new Date().toISOString(),
    salonId: context.salonId,
    sessionId: input.sessionId?.trim() || context.salonId,
    latestAnalysisId: context.latestAnalysisId,
    activeBook: context.activeBook,
    workspace: context.workspace
      ? {
          trialId: context.workspace.trialId,
          salonName: context.workspace.salonName,
          ownerName: context.workspace.ownerName,
          email: context.workspace.email,
          providerPlatform: context.workspace.providerPlatform,
          firstIngestCompleted: context.workspace.firstIngestCompleted,
          latestAnalysisId: context.workspace.latestAnalysisId,
          analysisIds: context.workspace.analysisIds,
          lastIngestAt: context.workspace.lastIngestAt,
          nextRefreshDueAt: context.workspace.nextRefreshDueAt,
        }
      : undefined,
    lastRoute: normalizeRoute(input.lastRoute),
    selected: input.selected,
    counts,
  };
  await writeSnapshotFile(snapshot);
  return snapshot;
}

export async function restoreVmbDevState(): Promise<
  | { ok: true; snapshot: VmbDevStateSnapshot; salonId: string; analysisId: string; redirectUrl: string }
  | { ok: false; status: 404 | 500; error: string }
> {
  const snapshot = await readSnapshotFile();
  const demoConfig = resolveAdminDemoBookConfig();
  const salonId = snapshot?.salonId?.trim() || demoConfig?.restrictToSalonId?.trim() || (demoConfig ? "vmb-admin-demo-salon" : undefined);
  const analysisId = snapshot?.latestAnalysisId?.trim() || snapshot?.activeBook?.analysisId?.trim() || demoConfig?.analysisId;

  if (!salonId || !analysisId) {
    return { ok: false, status: 404, error: "No captured VMB dev state or admin demo fallback is available." };
  }

  const outcome = await restoreActiveBookForSalon(salonId, analysisId);
  if (!outcome.ok) {
    return { ok: false, status: outcome.status === 500 ? 500 : 404, error: outcome.error };
  }

  if (snapshot?.activeBook) {
    await setActiveBookPointer({
      salonId,
      analysisId,
      clientCount: snapshot.activeBook.clientCount,
      recordCount: snapshot.activeBook.recordCount,
      sourceFileName: snapshot.activeBook.sourceFileName,
    });
  }
  await setLatestAnalysis(salonId, analysisId);

  const restoredSnapshot =
    snapshot ??
    (await captureVmbDevState({
      salonId,
      latestAnalysisId: analysisId,
      lastRoute: "/vmb/start",
    }));

  return {
    ok: true,
    snapshot: restoredSnapshot,
    salonId,
    analysisId,
    redirectUrl: normalizeRoute(restoredSnapshot.lastRoute),
  };
}

export async function clearVmbDevState(): Promise<void> {
  await removeSnapshotFile();
}
