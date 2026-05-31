// app/api/admin/intelligence/transpo/carriers/promote/route.ts
// POST /api/admin/intelligence/transpo/carriers/promote
// Promotes source-run records into the durable carrier master store.
//
// Body: { runId: string, mode: "all" | "selected", dotNumbers?: string[] }
// Response (HTTP 200 for all expected outcomes; 500 only for unexpected errors):
//   { ok: true,  created, updated, skipped, total, carrierCount, debug }
//   { ok: false, error, debug }
//
// Every failure path returns a precise `error` plus a `debug` object so the UI
// never has to fall back to a generic "ingest failed". Carrier master writes are
// best-effort but explicit: a write failure returns ok:false (no silent success).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { readRuns } from "@/lib/intelligence/transpo/sources/source-runs-store";
import {
  upsertCarrierTargetsFromSourceRun,
  getCarrierMasterFilePath,
} from "@/lib/intelligence/transpo/carrier-master-store";

export async function POST(req: NextRequest) {
  const carrierStorePath = getCarrierMasterFilePath();
  try {
    const body = (await req.json().catch(() => ({}))) as {
      runId?: string;
      mode?: "all" | "selected";
      dotNumbers?: string[];
    };

    const runId = (body.runId ?? "").trim();
    const mode = body.mode === "selected" ? "selected" : "all";
    const selectedDots = (body.dotNumbers ?? []).map((d) => String(d).trim()).filter(Boolean);
    const selectedCount = selectedDots.length;

    if (!runId) {
      return NextResponse.json(
        {
          ok: false,
          error: "runId is required",
          debug: { runId, mode, selectedCount, sourceRunFound: false, carrierStorePath },
        },
        { status: 400 },
      );
    }

    // Read source runs from the SAME store the FMCSA POST wrote to (Vercel-safe).
    const runs = await readRuns();
    const run = runs.find((r) => r.id === runId);

    if (!run) {
      // On Vercel /tmp is per-instance and ephemeral, so a run written by one
      // invocation may be invisible to another. Surface that explicitly.
      return NextResponse.json({
        ok: false,
        error: "Source run not found. Run history may be ephemeral on this deployment.",
        debug: {
          runId,
          mode,
          selectedCount,
          sourceRunFound: false,
          availableRunCount: runs.length,
          carrierStorePath,
        },
      });
    }

    const allRecords = run.records ?? [];
    let records = allRecords;
    if (mode === "selected") {
      const wanted = new Set(selectedDots);
      records = allRecords.filter((r) => r.dotNumber && wanted.has(r.dotNumber));
    }

    if (records.length === 0) {
      const emptyReason =
        mode === "selected" && allRecords.length > 0
          ? "No selected records matched a DOT number in this run."
          : "Source run has no records to promote.";
      return NextResponse.json({
        ok: false,
        error: emptyReason,
        debug: {
          runId,
          mode,
          selectedCount,
          sourceRunFound: true,
          sourceRecordCount: allRecords.length,
          recordCount: 0,
          carrierStorePath,
        },
      });
    }

    const summary = await upsertCarrierTargetsFromSourceRun({ ...run, records });

    const debug = {
      runId,
      mode,
      selectedCount,
      sourceRunFound: true,
      sourceRecordCount: allRecords.length,
      carrierStorePath,
      ...(summary.persistError ? { persistError: summary.persistError } : {}),
    };

    // Explicit, non-silent write failure: do NOT claim success.
    if (summary.persistError) {
      return NextResponse.json({
        ok: false,
        error: `Carrier master write failed: ${summary.persistError}`,
        debug,
      });
    }

    return NextResponse.json({
      ok: true,
      created: summary.created,
      updated: summary.updated,
      skipped: summary.skipped,
      total: summary.total,
      carrierCount: summary.carrierCount,
      debug,
    });
  } catch (e) {
    // Only genuinely unexpected route exceptions reach here.
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "carrier promotion failed", detail, debug: { carrierStorePath } },
      { status: 500 },
    );
  }
}
