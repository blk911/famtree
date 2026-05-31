// app/api/admin/intelligence/transpo/evidence/route.ts
// GET  /api/admin/intelligence/transpo/evidence  → evidence lake, newest first
// POST /api/admin/intelligence/transpo/evidence   → build evidence from a run
//
// POST body: { runId: string, run?: TranspoSourceRun }
//   The optional `run` is a client-side fallback: on Vercel the source-runs
//   store lives in per-instance /tmp, so a run written by the FMCSA pull may be
//   invisible to this invocation. When the store lookup misses, we fall back to
//   the run the Source Runs page already holds in memory.
//
// POST response (HTTP 200 for expected outcomes; 500 only for unexpected):
//   { ok: true,  created, skipped, evidenceCount, runId, debug }
//   { ok: false, error, debug }

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { readRuns } from "@/lib/intelligence/transpo/sources/source-runs-store";
import {
  readTranspoEvidence,
  appendTranspoEvidence,
  buildEvidenceFromSourceRun,
  getEvidenceStorePath,
} from "@/lib/intelligence/transpo/evidence-store";
import type { TranspoSourceRun } from "@/lib/intelligence/transpo/types";

function toTime(value: unknown): number {
  if (typeof value !== "string") return 0;
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

function isUsableRun(run: unknown, runId: string): run is TranspoSourceRun {
  return (
    !!run &&
    typeof run === "object" &&
    (run as TranspoSourceRun).id === runId &&
    Array.isArray((run as TranspoSourceRun).records)
  );
}

export async function GET() {
  const evidence = await readTranspoEvidence();
  evidence.sort((a, b) => toTime(b.observedAt) - toTime(a.observedAt));
  return NextResponse.json({ ok: true, evidence });
}

export async function POST(req: NextRequest) {
  const evidenceStorePath = getEvidenceStorePath();
  try {
    const body = (await req.json().catch(() => ({}))) as {
      runId?: string;
      run?: TranspoSourceRun;
    };
    const runId = (body.runId ?? "").trim();

    if (!runId) {
      return NextResponse.json(
        {
          ok: false,
          error: "runId is required",
          debug: { runId, sourceRunFound: false, evidenceStorePath },
        },
        { status: 400 },
      );
    }

    const runs = await readRuns();
    const availableRunCount = runs.length;
    const storeRun = runs.find((r) => r.id === runId);

    // Fall back to the client-supplied run when the ephemeral store missed it.
    const fallbackRun = isUsableRun(body.run, runId) ? body.run : undefined;
    const run = storeRun ?? fallbackRun;
    const sourceRunFound = Boolean(storeRun);

    if (!run) {
      return NextResponse.json({
        ok: false,
        error: "Source run not found. Run history may be ephemeral on this deployment.",
        debug: {
          runId,
          sourceRunFound: false,
          availableRunCount,
          sourceRecordCount: 0,
          builtEvidenceCount: 0,
          evidenceStorePath,
        },
      });
    }

    const sourceRecordCount = (run.records ?? []).length;
    if (sourceRecordCount === 0) {
      return NextResponse.json({
        ok: false,
        error: "Source run has no records to build evidence from.",
        debug: {
          runId,
          sourceRunFound,
          availableRunCount,
          sourceRecordCount: 0,
          builtEvidenceCount: 0,
          evidenceStorePath,
        },
      });
    }

    const items = buildEvidenceFromSourceRun(run);
    if (items.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "No usable evidence could be built (records lack a company name / identity).",
        debug: {
          runId,
          sourceRunFound,
          availableRunCount,
          sourceRecordCount,
          builtEvidenceCount: 0,
          evidenceStorePath,
        },
      });
    }

    const result = await appendTranspoEvidence(items);

    const debug = {
      runId,
      sourceRunFound,
      availableRunCount,
      sourceRecordCount,
      builtEvidenceCount: items.length,
      evidenceStorePath: result.path,
      ...(result.persistError ? { persistError: result.persistError } : {}),
    };

    if (result.persistError) {
      return NextResponse.json({
        ok: false,
        error: `Evidence write failed: ${result.persistError}`,
        debug,
      });
    }

    return NextResponse.json({
      ok: true,
      created: result.created,
      skipped: result.skipped,
      evidenceCount: result.evidenceCount,
      runId,
      debug,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "evidence build failed", detail, debug: { evidenceStorePath } },
      { status: 500 },
    );
  }
}
