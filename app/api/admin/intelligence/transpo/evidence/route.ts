// app/api/admin/intelligence/transpo/evidence/route.ts
// GET  /api/admin/intelligence/transpo/evidence  → evidence lake, newest first
// POST /api/admin/intelligence/transpo/evidence   → build evidence from a run
//
// POST body: { runId: string }
// POST response (HTTP 200 for expected outcomes; 500 only for unexpected):
//   { ok: true,  created, skipped, evidenceCount, runId }
//   { ok: false, error, debug }

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { readRuns } from "@/lib/intelligence/transpo/sources/source-runs-store";
import {
  readTranspoEvidence,
  appendTranspoEvidence,
  buildEvidenceFromSourceRun,
  getEvidenceFilePath,
} from "@/lib/intelligence/transpo/evidence-store";

function toTime(value: unknown): number {
  if (typeof value !== "string") return 0;
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

export async function GET() {
  const evidence = await readTranspoEvidence();
  evidence.sort((a, b) => toTime(b.observedAt) - toTime(a.observedAt));
  return NextResponse.json({ ok: true, evidence });
}

export async function POST(req: NextRequest) {
  const evidenceFilePath = getEvidenceFilePath();
  try {
    const body = (await req.json().catch(() => ({}))) as { runId?: string };
    const runId = (body.runId ?? "").trim();

    if (!runId) {
      return NextResponse.json(
        { ok: false, error: "runId is required", debug: { runId, evidenceFilePath } },
        { status: 400 },
      );
    }

    const runs = await readRuns();
    const run = runs.find((r) => r.id === runId);
    if (!run) {
      return NextResponse.json({
        ok: false,
        error: "Source run not found. Run history may be ephemeral on this deployment.",
        debug: { runId, availableRunCount: runs.length, evidenceFilePath },
      });
    }

    const sourceRecordCount = (run.records ?? []).length;
    if (sourceRecordCount === 0) {
      return NextResponse.json({
        ok: false,
        error: "Source run has no records to build evidence from.",
        debug: { runId, recordCount: 0, evidenceFilePath },
      });
    }

    const items = buildEvidenceFromSourceRun(run);
    if (items.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "No usable evidence could be built (records lack carrier identity).",
        debug: { runId, sourceRecordCount, evidenceFilePath },
      });
    }

    const result = await appendTranspoEvidence(items);

    if (result.persistError) {
      return NextResponse.json({
        ok: false,
        error: `Evidence write failed: ${result.persistError}`,
        debug: { runId, sourceRecordCount, built: items.length, evidenceFilePath },
      });
    }

    return NextResponse.json({
      ok: true,
      created: result.created,
      skipped: result.skipped,
      evidenceCount: result.evidenceCount,
      runId,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "evidence build failed", detail, debug: { evidenceFilePath } },
      { status: 500 },
    );
  }
}
