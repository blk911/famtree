export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { buildAndPersistServiceDeficits } from "@/lib/intelligence/transpo/service-deficits/build-service-deficits";

export async function POST() {
  try {
    const result = await buildAndPersistServiceDeficits();
    return NextResponse.json({
      ok: true,
      checkedCarriers: result.checkedCarriers,
      recordsBuilt: result.recordsBuilt,
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
