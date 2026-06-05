export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { buildAndPersistServiceDeficits } from "@/lib/intelligence/transpo/service-deficits/build-service-deficits";
import type { TranspoServiceDeficitBuildMode } from "@/lib/intelligence/transpo/service-deficits/deficit-types";

function parseMode(body: unknown): TranspoServiceDeficitBuildMode {
  if (body && typeof body === "object" && "mode" in body) {
    const m = (body as { mode?: string }).mode;
    if (m === "observed") return "observed";
  }
  return "colorado_baseline";
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const mode = parseMode(body);
    const result = await buildAndPersistServiceDeficits(mode);
    return NextResponse.json({
      ok: true,
      mode: result.mode,
      checkedCarriers: result.checkedCarriers,
      recordsBuilt: result.recordsBuilt,
      countiesEvaluated: result.countiesEvaluated,
      expectedColoradoCounties: result.expectedColoradoCounties,
      countyServiceRows: result.countyServiceRows,
      zeroProviderRows: result.zeroProviderRows,
      criticalZeroProviderRows: result.criticalZeroProviderRows,
      baselineRows: result.baselineRows,
      observedRows: result.observedRows,
      critical: result.critical,
      high: result.high,
      medium: result.medium,
      low: result.low,
      ...(result.persistWarnings.length ? { persistWarnings: result.persistWarnings } : {}),
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "service deficit backfill failed", detail }, { status: 500 });
  }
}
