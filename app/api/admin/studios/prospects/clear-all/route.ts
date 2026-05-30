// app/api/admin/studios/prospects/clear-all/route.ts
// POST /api/admin/studios/prospects/clear-all
// Admin-only. Wipes the entire prospect store for a clean testing slate.
//
// Two-phase design — the client calls twice:
//   Phase 1: body { confirm: false }  → returns { ok: true, count: N, cleared: false }
//   Phase 2: body { confirm: true }   → wipes store, returns { ok: true, count: N, cleared: true }
//
// This makes the UI two-step: first get the count to show in a confirm dialog,
// then post again with confirm:true to actually execute.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { countProspects, clearAllProspects } from "@/lib/studios/prospects/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { confirm?: boolean };
    const confirmed = body.confirm === true;

    if (!confirmed) {
      // Phase 1 — count only, no write
      const count = await countProspects();
      return NextResponse.json({ ok: true, count, cleared: false });
    }

    // Phase 2 — wipe
    const count = await clearAllProspects();
    return NextResponse.json({ ok: true, count, cleared: true });

  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "clear failed", detail }, { status: 500 });
  }
}
