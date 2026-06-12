import type { VmbSalonWorkspace } from "@/types/vmb/workspace";
import { prisma, resolveVmbStorageBackend } from "@/lib/vmb/db";

function isWorkspace(item: unknown): item is VmbSalonWorkspace {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as VmbSalonWorkspace).trialId === "string" &&
    Array.isArray((item as VmbSalonWorkspace).analysisIds)
  );
}

function parsePayload(raw: unknown): VmbSalonWorkspace | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    try {
      return parsePayload(JSON.parse(raw) as unknown);
    } catch {
      return undefined;
    }
  }
  return isWorkspace(raw) ? raw : undefined;
}

type WorkspaceRow = { payload: unknown };

export async function getWorkspaceForTrialPostgres(
  trialId: string,
): Promise<VmbSalonWorkspace | undefined> {
  const backend = await resolveVmbStorageBackend();
  if (backend !== "postgres") return undefined;

  try {
    const rows = await prisma.$queryRaw<WorkspaceRow[]>`
      SELECT payload FROM vmb_salon_workspace WHERE trial_id = ${trialId.trim()} LIMIT 1
    `;
    return parsePayload(rows[0]?.payload);
  } catch {
    return undefined;
  }
}

export async function saveWorkspacePostgres(
  workspace: VmbSalonWorkspace,
): Promise<string | null> {
  try {
    const backend = await resolveVmbStorageBackend();
    if (backend !== "postgres") return "Postgres backend unavailable";

    await prisma.$executeRaw`
      INSERT INTO vmb_salon_workspace (
        trial_id,
        salon_id,
        payload,
        first_ingest_completed,
        latest_analysis_id,
        updated_at
      )
      VALUES (
        ${workspace.trialId},
        ${workspace.trialId},
        ${JSON.stringify(workspace)}::jsonb,
        ${workspace.firstIngestCompleted ?? false},
        ${workspace.latestAnalysisId ?? null},
        now()
      )
      ON CONFLICT (trial_id) DO UPDATE SET
        salon_id = EXCLUDED.salon_id,
        payload = EXCLUDED.payload,
        first_ingest_completed = EXCLUDED.first_ingest_completed,
        latest_analysis_id = EXCLUDED.latest_analysis_id,
        updated_at = now()
    `;
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export async function listWorkspacesPostgres(): Promise<VmbSalonWorkspace[]> {
  const backend = await resolveVmbStorageBackend();
  if (backend !== "postgres") return [];

  try {
    const rows = await prisma.$queryRaw<WorkspaceRow[]>`
      SELECT payload FROM vmb_salon_workspace ORDER BY updated_at DESC
    `;
    return rows.map((row) => parsePayload(row.payload)).filter((w): w is VmbSalonWorkspace => !!w);
  } catch {
    return [];
  }
}
