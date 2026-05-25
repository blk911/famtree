// app/api/admin/studios/prospects/list/route.ts
// GET /api/admin/studios/prospects/list
// Returns all prospect records. Admin-only. Not exposed to members.

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listProspects } from "@/lib/studios/prospects/store";
import type { ProspectListResponse, ProspectErrorResponse } from "@/lib/studios/prospects/types";

export async function GET() {
  try {
    const prospects = await listProspects();
    return NextResponse.json(
      { ok: true, prospects, total: prospects.length } satisfies ProspectListResponse
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[prospects/list] error:", msg);
    return NextResponse.json(
      { ok: false, error: "Failed to load prospects", detail: msg } satisfies ProspectErrorResponse,
      { status: 500 }
    );
  }
}
