// app/api/admin/intelligence/transpo/source-runs/fmcsa/route.ts
// POST /api/admin/intelligence/transpo/source-runs/fmcsa
// Runs an FMCSA source pull and persists the resulting source run artifact.
//
// Body: { market, state?, city?, keyword?, limit?, notes?, providerKind? }
// Response:
//   { ok: true,  run, debug }                  — provider returned records
//   { ok: false, error, run, debug }           — provider failed gracefully (HTTP 200)
//   { ok: false, error, detail } (HTTP 500)    — unexpected route exception only
//
// Provider failures (no rows, filter rejected, timeout, live unavailable, CSV
// missing) are EXPECTED: they return HTTP 200 with the provider message surfaced
// so the UI can show exact diagnostics. The run is still persisted (recordCount
// may be 0) so it can be reviewed in Source Runs.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { runFmcsaTestPull } from "@/lib/intelligence/transpo/sources/fmcsa-source";
import { appendRun } from "@/lib/intelligence/transpo/sources/source-runs-store";
import type {
  TranspoSourceRun,
  TranspoSourceRunInput,
} from "@/lib/intelligence/transpo/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      market?: string;
      state?: string;
      city?: string;
      keyword?: string;
      limit?: number;
      notes?: string;
      providerKind?: string;
    };

    const market = (body.market ?? "").trim();
    if (!market) {
      return NextResponse.json(
        { ok: false, error: "market is required" },
        { status: 400 },
      );
    }

    const input: TranspoSourceRunInput = {
      market,
      state: (body.state ?? "").trim() || undefined,
      city: (body.city ?? "").trim() || undefined,
      keyword: (body.keyword ?? "").trim() || undefined,
      limit:
        typeof body.limit === "number" && Number.isFinite(body.limit)
          ? body.limit
          : undefined,
      notes: (body.notes ?? "").trim() || undefined,
    };

    // Provider resolution priority: request body → TRANSPO_FMCSA_PROVIDER → "mock".
    // runFmcsaTestPull degrades gracefully and never throws for provider issues.
    const result = await runFmcsaTestPull(input, body.providerKind);
    const { ok, sourceMode, records, providerKind, message } = result;

    const run: TranspoSourceRun = {
      id: `transpo-fmcsa-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      vertical: "transpo",
      source: "fmcsa",
      sourceMode,
      input,
      recordCount: records.length,
      records,
      createdAt: new Date().toISOString(),
      providerKind,
      ...(message ? { message } : {}),
    };

    // Persist best-effort — a read-only filesystem must not fail the request.
    const persistError = await appendRun(run);

    const debug = {
      providerKind,
      sourceMode,
      message: message ?? null,
      recordCount: records.length,
      endpoint: "data.transportation.gov az4n-8mr2",
      ...(persistError ? { persistError } : {}),
    };

    if (!ok) {
      return NextResponse.json({
        ok: false,
        error: message ?? "FMCSA provider returned no records.",
        run,
        debug,
      });
    }

    return NextResponse.json({ ok: true, run, debug });
  } catch (e) {
    // Only genuinely unexpected route exceptions reach here.
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "fmcsa test pull failed", detail },
      { status: 500 },
    );
  }
}
