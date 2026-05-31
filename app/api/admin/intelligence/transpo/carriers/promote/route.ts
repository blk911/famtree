// app/api/admin/intelligence/transpo/carriers/promote/route.ts
// POST /api/admin/intelligence/transpo/carriers/promote
// Promotes source-run records into the durable carrier master store.
//
// Body: { runId: string, mode: "all" | "selected", dotNumbers?: string[] }
// Response: { ok: true, created, updated, skipped, total, carrierCount }
//           { ok: false, error } (HTTP 200 for expected misses, 500 for unexpected)

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { readRuns } from "@/lib/intelligence/transpo/sources/source-runs-store";
import { upsertCarrierTargetsFromSourceRun } from "@/lib/intelligence/transpo/carrier-master-store";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      runId?: string;
      mode?: "all" | "selected";
      dotNumbers?: string[];
    };

    const runId = (body.runId ?? "").trim();
    if (!runId) {
      return NextResponse.json({ ok: false, error: "runId is required" }, { status: 400 });
    }

    const mode = body.mode === "selected" ? "selected" : "all";

    const runs = await readRuns();
    const run = runs.find((r) => r.id === runId);
    if (!run) {
      return NextResponse.json(
        { ok: false, error: `Source run not found: ${runId}` },
        { status: 404 },
      );
    }

    let records = run.records ?? [];
    if (mode === "selected") {
      const wanted = new Set((body.dotNumbers ?? []).map((d) => String(d).trim()).filter(Boolean));
      records = records.filter((r) => r.dotNumber && wanted.has(r.dotNumber));
    }

    const summary = await upsertCarrierTargetsFromSourceRun({ ...run, records });

    return NextResponse.json({
      ok: true,
      created: summary.created,
      updated: summary.updated,
      skipped: summary.skipped,
      total: summary.total,
      carrierCount: summary.carrierCount,
      ...(summary.persistError ? { persistError: summary.persistError } : {}),
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "carrier promotion failed", detail },
      { status: 500 },
    );
  }
}
