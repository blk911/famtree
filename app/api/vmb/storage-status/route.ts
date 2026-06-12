export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getVmbDataDir } from "@/lib/vmb/paths";
import { getVmbStorageStats } from "@/lib/vmb/storage-stats";

/** Production-safe VMB storage probe. */
export async function GET() {
  const stats = await getVmbStorageStats();
  return NextResponse.json({
    ok: true,
    data: {
      backend: stats.backend,
      durable: stats.durable,
      databaseUrlPresent: stats.databaseUrlPresent,
      databaseConnected: stats.databaseConnected,
      vercel: stats.vercel,
      dataDir: getVmbDataDir(),
      analysisCount: stats.analysisCount,
      workspaceCount: stats.workspaceCount,
      latestAnalysisId: stats.latestAnalysisId,
      latestWorkspaceId: stats.latestWorkspaceId,
      activeBookCount: stats.activeBookCount,
      trialCount: stats.trialCount,
      inviteDraftCount: stats.inviteDraftCount,
      taikos: stats.taikos,
      note:
        stats.vercel && !stats.durable
          ? "VMB requires Postgres on Vercel — set DATABASE_URL and redeploy."
          : null,
    },
  });
}
