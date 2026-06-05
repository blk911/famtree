// POST /api/admin/intelligence/transpo/market-gaps/backfill

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { readCarrierMaster } from "@/lib/intelligence/transpo/carrier-master-store";
import { readCarrierVerifications } from "@/lib/intelligence/transpo/verification-store";
import { buildTranspoMarketGapRecords } from "@/lib/intelligence/transpo/market-gaps/gap-engine";
import { writeMarketGapCache } from "@/lib/intelligence/transpo/market-gaps/gap-store";

export async function POST() {
  try {
    const [carriers, verifications] = await Promise.all([
      readCarrierMaster(),
      readCarrierVerifications(),
    ]);

    const records = buildTranspoMarketGapRecords({ carriers, verifications });
    const persistError = await writeMarketGapCache(records);

    const critical = records.filter((r) => r.severity === "critical").length;
    const high = records.filter((r) => r.severity === "high").length;
    const medium = records.filter((r) => r.severity === "medium").length;
    const low = records.filter((r) => r.severity === "low").length;

    return NextResponse.json({
      ok: true,
      checkedCarriers: carriers.length,
      recordsBuilt: records.length,
      critical,
      high,
      medium,
      low,
      ...(persistError ? { persistWarning: persistError } : {}),
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "market gap backfill failed", detail }, { status: 500 });
  }
}
