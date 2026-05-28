// app/api/admin/studios/storage/status/route.ts
// Admin diagnostics for runtime artifact storage and canonical prospect durability.

export const dynamic = "force-dynamic";

import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import { getStoreBackendInfo, listProspects } from "@/lib/studios/prospects/store";
import { getStyleSeatDataRoot, listStyleSeatRuns } from "@/lib/studios/styleseat/store";

async function getFileStats(filePath: string | null): Promise<{ bytes: number; modifiedAt: string | null }> {
  if (!filePath) return { bytes: 0, modifiedAt: null };
  try {
    const stat = await fs.stat(filePath);
    return { bytes: stat.size, modifiedAt: stat.mtime.toISOString() };
  } catch {
    return { bytes: 0, modifiedAt: null };
  }
}

function isTmpPath(value: string | null): boolean {
  if (!value) return false;
  const normalized = value.replace(/\\/g, "/").toLowerCase();
  return normalized === "/tmp" || normalized.startsWith("/tmp/");
}

export async function GET() {
  try {
    const backendInfo = await getStoreBackendInfo();
    const prospects = await listProspects();
    const styleseatRuns = await listStyleSeatRuns();
    const runtimeDataRoot = getStyleSeatDataRoot();
    const storeStats = await getFileStats(backendInfo.storePath);
    const lastSavedProspectTimestamp = prospects
      .map((prospect) => prospect.updatedAt || prospect.createdAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

    const isEphemeralRuntime = isTmpPath(runtimeDataRoot) || isTmpPath(backendInfo.storePath);
    const databaseUrlPresent = !!process.env.DATABASE_URL;
    const durableDatabaseConfigured = databaseUrlPresent && backendInfo.backend === "postgres";
    const warnings = [
      ...(isEphemeralRuntime ? ["Prospects are stored in ephemeral runtime storage and may not persist across deployments."] : []),
      ...(backendInfo.backend !== "postgres" ? ["Canonical prospects are not using the durable Postgres backend."] : []),
      ...(!databaseUrlPresent ? ["DATABASE_URL is not present."] : []),
    ];

    return NextResponse.json({
      ok: true,
      NODE_ENV: process.env.NODE_ENV ?? null,
      vercel: !!process.env.VERCEL,
      runtimeDataRoot,
      isEphemeralRuntime,
      styleseatRunsCount: styleseatRuns.length,
      latestStyleSeatRunId: styleseatRuns[0]?.run.runId ?? null,
      latestStyleSeatRunCreatedAt: styleseatRuns[0]?.run.createdAt ?? null,
      prospectStorePath: backendInfo.storePath,
      prospectStoreBackend: backendInfo.backend,
      prospectCount: prospects.length,
      prospectStoreBytes: storeStats.bytes,
      prospectStoreLastModifiedAt: storeStats.modifiedAt,
      lastSavedProspectTimestamp,
      durableDatabaseConfigured,
      databaseUrlPresent,
      warnings,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[studios/storage/status] error:", detail);
    return NextResponse.json(
      { ok: false, error: "Failed to inspect studios storage", detail },
      { status: 500 }
    );
  }
}
