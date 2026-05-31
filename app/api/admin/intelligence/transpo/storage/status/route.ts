// app/api/admin/intelligence/transpo/storage/status/route.ts
// GET /api/admin/intelligence/transpo/storage/status
// Reports which backend the Transpo intelligence stores are using and the row
// counts, so the UI can show "Postgres durable" vs "JSON runtime fallback".
//
// Response:
//   { ok, durable, backend, databaseUrlPresent,
//     sourceRunsCount, evidenceCount, carrierCount }

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getTranspoBackendInfo } from "@/lib/intelligence/transpo/db";
import { readRuns } from "@/lib/intelligence/transpo/sources/source-runs-store";
import { readTranspoEvidence } from "@/lib/intelligence/transpo/evidence-store";
import { readCarrierMaster } from "@/lib/intelligence/transpo/carrier-master-store";
import { isGoogleProviderConnected } from "@/lib/intelligence/transpo/verification/providers/google-business-provider";

export async function GET() {
  try {
    const info = await getTranspoBackendInfo();
    const [runs, evidence, carriers] = await Promise.all([
      readRuns(),
      readTranspoEvidence(),
      readCarrierMaster(),
    ]);

    return NextResponse.json({
      ok: true,
      durable: info.durable,
      backend: info.backend,
      databaseUrlPresent: info.databaseUrlPresent,
      sourceRunsCount: runs.length,
      evidenceCount: evidence.length,
      carrierCount: carriers.length,
      googleProviderConnected: isGoogleProviderConnected(),
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "storage status failed", detail },
      { status: 500 },
    );
  }
}
