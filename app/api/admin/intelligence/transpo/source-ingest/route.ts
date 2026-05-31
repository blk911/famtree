// app/api/admin/intelligence/transpo/source-ingest/route.ts
// POST /api/admin/intelligence/transpo/source-ingest
// Creates a manual source run and persists it to the shared, Vercel-safe store.
//
// Body: { sourceType: string, market: string, notes?: string }
// Response: { ok: true, runId, debug } | { ok: false, error, debug }
//
// Persistence goes through appendRun() (the same source-runs-store helper the
// FMCSA POST uses) so manual runs land in the same history the Source Runs page
// and promote route read. Writes are best-effort: a read-only filesystem returns
// ok:false with the exact reason instead of a generic "ingest failed".

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { appendRun, getRunsFilePath } from "@/lib/intelligence/transpo/sources/source-runs-store";
import type { TranspoSourceRun } from "@/lib/intelligence/transpo/types";

export async function POST(req: NextRequest) {
  const runsFilePath = getRunsFilePath();
  try {
    const body = (await req.json().catch(() => ({}))) as {
      sourceType?: string;
      market?: string;
      notes?: string;
    };

    const sourceType = (body.sourceType ?? "").trim();
    const market = (body.market ?? "").trim();
    const notes = (body.notes ?? "").trim();

    if (!market) {
      return NextResponse.json(
        { ok: false, error: "market is required", debug: { runsFilePath } },
        { status: 400 },
      );
    }

    const runId = `transpo-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const run: TranspoSourceRun = {
      id: runId,
      vertical: "transpo",
      source: "fmcsa",
      sourceMode: "manual",
      input: { market, notes: notes || undefined },
      recordCount: 0,
      records: [],
      createdAt: new Date().toISOString(),
      providerKind: "manual",
      message: `Manual source run (${sourceType || "Unknown"} / ${market})`,
    };

    // Best-effort persistence — a read-only filesystem returns a reason, not a throw.
    const persistError = await appendRun(run);
    if (persistError) {
      return NextResponse.json({
        ok: false,
        error: `Source run write failed: ${persistError}`,
        debug: { runId, runsFilePath, persistError },
      });
    }

    return NextResponse.json({ ok: true, runId, debug: { runId, runsFilePath } });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: `ingest failed: ${detail}`, debug: { runsFilePath } },
      { status: 500 },
    );
  }
}
