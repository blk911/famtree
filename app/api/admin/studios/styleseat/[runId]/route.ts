// app/api/admin/studios/styleseat/[runId]/route.ts
// GET one StyleSeat run with all available artifacts.

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { loadStyleSeatRun } from "@/lib/studios/styleseat/store";
import type { StyleSeatDetailResponse, StyleSeatErrorResponse } from "@/lib/studios/styleseat/types";

export async function GET(
  _req: Request,
  { params }: { params: { runId: string } },
) {
  const runId = decodeURIComponent(params.runId ?? "");
  if (!runId) {
    return NextResponse.json(
      { ok: false, error: "Missing StyleSeat run id" } satisfies StyleSeatErrorResponse,
      { status: 400 },
    );
  }

  try {
    const file = await loadStyleSeatRun(runId);
    if (!file) {
      return NextResponse.json(
        { ok: false, error: "StyleSeat run not found" } satisfies StyleSeatErrorResponse,
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      run: file.run,
      operators: file.operators,
      raw: file.operators,
      normalized: file.normalized ?? [],
      results: file.results,
      prospects: file.prospects ?? [],
      failures: file.failures ?? [],
      log: file.log ?? [],
      report: file.report ?? file.run.report ?? null,
    } satisfies StyleSeatDetailResponse);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[styleseat/detail] error:", msg);
    return NextResponse.json(
      { ok: false, error: "Failed to load StyleSeat run", detail: msg } satisfies StyleSeatErrorResponse,
      { status: 500 },
    );
  }
}
