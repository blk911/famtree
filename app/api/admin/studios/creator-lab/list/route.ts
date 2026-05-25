// app/api/admin/studios/creator-lab/list/route.ts
// GET /api/admin/studios/creator-lab/list
// Returns index of all assembled studios (lightweight — no htmlText or signals).

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listCreatorStudios } from "@/lib/studios/creator-lab/store";

export async function GET() {
  try {
    const entries = await listCreatorStudios();
    return NextResponse.json({ ok: true, entries });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[creator-lab/list]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
