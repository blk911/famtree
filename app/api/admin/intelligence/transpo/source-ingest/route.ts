// app/api/admin/intelligence/transpo/source-ingest/route.ts
// POST /api/admin/intelligence/transpo/source-ingest
// Creates a source run record and saves it to the local runtime store.
//
// Body: { sourceType: string, market: string, notes?: string }
// Response: { ok: true, runId: string } | { ok: false, error: string }

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const RUNS_DIR = path.join(process.cwd(), "runtime-data", "intelligence", "transpo", "source-runs");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as {
      sourceType?: string;
      market?: string;
      notes?: string;
    };

    const sourceType = (body.sourceType ?? "").trim();
    const market = (body.market ?? "").trim();
    const notes = (body.notes ?? "").trim();

    if (!market) {
      return NextResponse.json({ ok: false, error: "market is required" }, { status: 400 });
    }

    const runId = `transpo-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const run = {
      runId,
      verticalKey: "transpo",
      sourceType: sourceType || "Unknown",
      market,
      notes: notes || null,
      createdAt: new Date().toISOString(),
      status: "pending",
      recordCount: 0,
    };

    // Ensure directory exists
    await fs.mkdir(RUNS_DIR, { recursive: true });
    await fs.writeFile(
      path.join(RUNS_DIR, `${runId}.json`),
      JSON.stringify(run, null, 2),
      "utf8",
    );

    return NextResponse.json({ ok: true, runId });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "ingest failed", detail }, { status: 500 });
  }
}
