import {
  ensureVmbStorageTables,
  prisma,
  resolveVmbStorageBackend,
  vmbDatabaseUrlPresent,
} from "@/lib/vmb/db";
import { getTaikosStorageStats, type TaikosStorageStats } from "@/lib/taikos/storage/taikos-storage-stats";

export type VmbStorageStats = {
  backend: "postgres" | "json";
  durable: boolean;
  databaseUrlPresent: boolean;
  databaseConnected: boolean;
  vercel: boolean;
  analysisCount: number;
  workspaceCount: number;
  latestAnalysisId: string | null;
  latestWorkspaceId: string | null;
  activeBookCount: number;
  trialCount: number;
  inviteDraftCount: number;
  taikos?: Pick<
    TaikosStorageStats,
    | "backend"
    | "durable"
    | "queueCount"
    | "draftCount"
    | "goalCount"
    | "activityCount"
    | "sessionCount"
  >;
};

export async function probeVmbDatabaseConnected(): Promise<boolean> {
  if (!vmbDatabaseUrlPresent()) return false;
  try {
    await ensureVmbStorageTables();
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function getVmbStorageStats(): Promise<VmbStorageStats> {
  const backend = await resolveVmbStorageBackend();
  const databaseUrlPresent = vmbDatabaseUrlPresent();
  const databaseConnected = await probeVmbDatabaseConnected();

  const empty: VmbStorageStats = {
    backend,
    durable: backend === "postgres",
    databaseUrlPresent,
    databaseConnected,
    vercel: Boolean(process.env.VERCEL),
    analysisCount: 0,
    workspaceCount: 0,
    latestAnalysisId: null,
    latestWorkspaceId: null,
    activeBookCount: 0,
    trialCount: 0,
    inviteDraftCount: 0,
  };

  if (backend !== "postgres" || !databaseConnected) return empty;

  try {
    const [analysisCountRow, workspaceCountRow, latestAnalysisRow, latestWorkspaceRow, activeBookRow, trialRow, inviteRow] =
      await Promise.all([
        prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM vmb_book_analysis`,
        prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM vmb_salon_workspace`,
        prisma.$queryRaw<Array<{ analysis_id: string }>>`
          SELECT analysis_id FROM vmb_book_analysis ORDER BY updated_at DESC LIMIT 1
        `,
        prisma.$queryRaw<Array<{ trial_id: string }>>`
          SELECT trial_id FROM vmb_salon_workspace ORDER BY updated_at DESC LIMIT 1
        `,
        prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM vmb_active_book`,
        prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM vmb_trial_lead`,
        prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM vmb_invite_draft`,
      ]);

    return {
      ...empty,
      analysisCount: Number(analysisCountRow[0]?.count ?? 0),
      workspaceCount: Number(workspaceCountRow[0]?.count ?? 0),
      latestAnalysisId: latestAnalysisRow[0]?.analysis_id ?? null,
      latestWorkspaceId: latestWorkspaceRow[0]?.trial_id ?? null,
      activeBookCount: Number(activeBookRow[0]?.count ?? 0),
      trialCount: Number(trialRow[0]?.count ?? 0),
      inviteDraftCount: Number(inviteRow[0]?.count ?? 0),
      taikos: await getTaikosStorageSummary(),
    };
  } catch {
    return empty;
  }
}

async function getTaikosStorageSummary(): Promise<VmbStorageStats["taikos"]> {
  const stats = await getTaikosStorageStats();
  return {
    backend: stats.backend,
    durable: stats.durable,
    queueCount: stats.queueCount,
    draftCount: stats.draftCount,
    goalCount: stats.goalCount,
    activityCount: stats.activityCount,
    sessionCount: stats.sessionCount,
  };
}
