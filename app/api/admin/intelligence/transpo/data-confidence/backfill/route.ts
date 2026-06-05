export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { buildAndPersistDataConfidence } from "@/lib/intelligence/transpo/data-confidence/build-data-confidence";

export async function POST() {
  try {
    const result = await buildAndPersistDataConfidence();
    return NextResponse.json({
      ok: true,
      recordsBuilt: result.recordsBuilt,
      deficitsUpdated: result.deficitsUpdated,
      high: result.high,
      medium: result.medium,
      low: result.low,
      experimental: result.experimental,
      byCarrierSupply: result.byCarrierSupply,
      byDemand: result.byDemand,
      byPayer: result.byPayer,
      setup: result.setup,
      ...(result.persistWarnings.length ? { persistWarnings: result.persistWarnings } : {}),
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "confidence backfill failed", detail }, { status: 500 });
  }
}
