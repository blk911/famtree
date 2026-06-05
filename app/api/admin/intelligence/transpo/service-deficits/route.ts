export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { buildAndPersistServiceDeficits } from "@/lib/intelligence/transpo/service-deficits/build-service-deficits";
import { buildTranspoServiceDeficitQuestions, buildTranspoServiceDeficitSummary } from "@/lib/intelligence/transpo/service-deficits/deficit-summary";
import { readServiceDeficitCache } from "@/lib/intelligence/transpo/service-deficits/deficit-store";

export async function GET() {
  try {
    let records = await readServiceDeficitCache();
    const fromCache = records.length > 0;

    if (!fromCache) {
      const built = await buildAndPersistServiceDeficits();
      records = built.records;
    }

    const summary = buildTranspoServiceDeficitSummary(records);
    const questions = buildTranspoServiceDeficitQuestions(records, summary);

    return NextResponse.json({
      ok: true,
      summary,
      records,
      questions,
      meta: { fromCache, recordCount: records.length },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "service deficits failed", detail }, { status: 500 });
  }
}
