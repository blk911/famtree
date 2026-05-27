// app/api/admin/studios/prospects/health/route.ts
// GET /api/admin/studios/prospects/health
// Admin diagnostics for the prospect store backend and record hygiene.

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getStoreBackendInfo, listProspects } from "@/lib/studios/prospects/store";
import type { ProspectErrorResponse } from "@/lib/studios/prospects/types";

function hasDuplicatedSourcePath(path: string): boolean {
  const parts = path.split("/").map((p) => p.trim().toLowerCase()).filter(Boolean);
  return parts.some((part, idx) => {
    const prev = parts[idx - 1];
    return !!prev && prev.endsWith(" import") && part.includes(prev);
  });
}

export async function GET() {
  try {
    const backendInfo = await getStoreBackendInfo();
    const prospects = await listProspects();

    const missingIdentityFingerprint = prospects.filter((p) => !p.identityFingerprint).length;
    const duplicatedSourcePath = prospects.filter((p) => p.sourcePath && hasDuplicatedSourcePath(p.sourcePath)).length;
    const missingSourcePath = prospects.filter((p) => !p.sourcePath).length;

    const warnings = [
      ...(backendInfo.backend === "json" ? ["Using JSON prospect store fallback"] : []),
      ...(missingIdentityFingerprint > 0 ? [`${missingIdentityFingerprint} prospect(s) missing identityFingerprint`] : []),
      ...(duplicatedSourcePath > 0 ? [`${duplicatedSourcePath} prospect(s) with duplicated sourcePath labels`] : []),
      ...(missingSourcePath > 0 ? [`${missingSourcePath} prospect(s) missing sourcePath`] : []),
    ];

    return NextResponse.json({
      ok: true,
      backend: backendInfo.backend,
      selectedBackend: backendInfo.backend,
      backendInfo,
      envSetting: backendInfo.envSetting,
      storePath: backendInfo.storePath,
      total: prospects.length,
      checks: {
        missingIdentityFingerprint,
        duplicatedSourcePath,
        missingSourcePath,
      },
      warnings,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[prospects/health] error:", msg);
    return NextResponse.json(
      { ok: false, error: "Failed to inspect prospect store", detail: msg } satisfies ProspectErrorResponse,
      { status: 500 }
    );
  }
}
