// GET /api/admin/intelligence/salon/google-identity

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { buildSalonGoogleIdentityReport } from "@/lib/intelligence/salon/google-identity/google-identity-engine";
import { loadGoogleIdentityCacheFromDisk } from "@/lib/intelligence/salon/google-identity/google-identity-store";

export async function GET(req: NextRequest) {
  try {
    const useCache = req.nextUrl.searchParams.get("cache") !== "false";
    if (useCache) {
      await loadGoogleIdentityCacheFromDisk();
    }
    const report = await buildSalonGoogleIdentityReport({ useCache });
    return NextResponse.json(report);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "google_identity_failed", detail },
      { status: 500 },
    );
  }
}
