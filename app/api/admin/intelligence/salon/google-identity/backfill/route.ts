// POST /api/admin/intelligence/salon/google-identity/backfill

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runGoogleIdentityBackfill } from "@/lib/intelligence/salon/google-identity/google-identity-engine";

export async function POST(req: NextRequest) {
  try {
    let limit = 500;
    let persist = true;
    try {
      const body = (await req.json()) as { limit?: number; persist?: boolean };
      if (typeof body.limit === "number") limit = body.limit;
      if (body.persist === false) persist = false;
    } catch {
      // empty body OK
    }
    const result = await runGoogleIdentityBackfill({ limit, persist });
    return NextResponse.json(result);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "google_identity_backfill_failed", detail },
      { status: 500 },
    );
  }
}
