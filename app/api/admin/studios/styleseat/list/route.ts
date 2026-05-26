// app/api/admin/studios/styleseat/list/route.ts
// GET /api/admin/studios/styleseat/list
// Returns a list of StyleSeat harvest run summaries (no full result arrays).
// Admin-only. Not exposed to members.

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listStyleSeatRuns } from "@/lib/studios/styleseat/store";
import type { StyleSeatListResponse, StyleSeatErrorResponse } from "@/lib/studios/styleseat/types";

export async function GET() {
  try {
    const files = await listStyleSeatRuns();
    const runs  = files.map((f) => f.run);

    return NextResponse.json(
      { ok: true, runs, total: runs.length } satisfies StyleSeatListResponse
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[styleseat/list] error:", msg);
    return NextResponse.json(
      { ok: false, error: "Failed to load StyleSeat runs", detail: msg } satisfies StyleSeatErrorResponse,
      { status: 500 }
    );
  }
}
