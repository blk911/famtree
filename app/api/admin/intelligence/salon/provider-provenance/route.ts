// GET /api/admin/intelligence/salon/provider-provenance

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { buildSalonProviderProvenanceReport } from "@/lib/intelligence/salon/provider-provenance/provenance-engine";
import { loadProvenanceCacheFromDisk } from "@/lib/intelligence/salon/provider-provenance/provenance-store";

export async function GET(req: NextRequest) {
  try {
    const useCache = req.nextUrl.searchParams.get("cache") !== "false";
    if (useCache) {
      await loadProvenanceCacheFromDisk();
    }
    const report = await buildSalonProviderProvenanceReport({ useCache });
    return NextResponse.json(report);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "provider_provenance_failed", detail },
      { status: 500 },
    );
  }
}
