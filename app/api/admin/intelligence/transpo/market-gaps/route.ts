// GET /api/admin/intelligence/transpo/market-gaps

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { readCarrierMaster } from "@/lib/intelligence/transpo/carrier-master-store";
import { readCarrierVerifications } from "@/lib/intelligence/transpo/verification-store";
import { buildTranspoMarketGapRecords } from "@/lib/intelligence/transpo/market-gaps/gap-engine";
import { buildTranspoMarketGapQuestions, buildTranspoMarketGapSummary } from "@/lib/intelligence/transpo/market-gaps/gap-summary";
import { readMarketGapCache } from "@/lib/intelligence/transpo/market-gaps/gap-store";

export async function GET() {
  try {
    let records = await readMarketGapCache();
    const fromCache = records.length > 0;

    if (!fromCache) {
      const [carriers, verifications] = await Promise.all([
        readCarrierMaster(),
        readCarrierVerifications(),
      ]);
      records = buildTranspoMarketGapRecords({ carriers, verifications });
    }

    const summary = buildTranspoMarketGapSummary(records);
    const questions = buildTranspoMarketGapQuestions(records, summary);

    return NextResponse.json({
      ok: true,
      summary,
      records,
      questions,
      meta: {
        fromCache,
        recordCount: records.length,
      },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "market gaps failed", detail }, { status: 500 });
  }
}
