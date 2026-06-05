export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { buildAndPersistDataConfidence } from "@/lib/intelligence/transpo/data-confidence/build-data-confidence";
import {
  buildTranspoDataConfidenceQuestions,
  buildTranspoDataConfidenceSummary,
} from "@/lib/intelligence/transpo/data-confidence/data-confidence-summary";
import { readDataConfidenceCache } from "@/lib/intelligence/transpo/data-confidence/confidence-store";
import { buildLiveDataSetupStatus, type DataConfidenceContext } from "@/lib/intelligence/transpo/data-confidence/data-confidence-engine";
import { readCarrierMaster } from "@/lib/intelligence/transpo/carrier-master-store";
import { readCountyDemandCache } from "@/lib/intelligence/transpo/demand/demand-store";
import { buildColoradoCountyCoverageSummary } from "@/lib/intelligence/transpo/payers/payer-engine";
import { readPayerCache } from "@/lib/intelligence/transpo/payers/payer-store";
import { readServiceDeficitCache, readServiceDeficitCacheMeta } from "@/lib/intelligence/transpo/service-deficits/deficit-store";
import { readRuns } from "@/lib/intelligence/transpo/sources/source-runs-store";
import { readCarrierVerifications } from "@/lib/intelligence/transpo/verification-store";

export async function GET() {
  try {
    let records = await readDataConfidenceCache();
    const fromCache = records.length > 0;

    if (!fromCache) {
      const built = await buildAndPersistDataConfidence();
      records = built.records;
    }

    const deficits = await readServiceDeficitCache();
    const summary = buildTranspoDataConfidenceSummary(records);
    const deficitMeta = await readServiceDeficitCacheMeta();
    const questions = buildTranspoDataConfidenceQuestions(records, summary, deficits, deficitMeta);

    const [carriers, verifications, sourceRuns, demandRecords, payers] = await Promise.all([
      readCarrierMaster(),
      readCarrierVerifications(),
      readRuns(),
      readCountyDemandCache(),
      readPayerCache(),
    ]);
    const ctx: DataConfidenceContext = {
      carriers,
      verifications,
      sourceRuns,
      demandRecords,
      payers,
    };
    const setup = await buildLiveDataSetupStatus(ctx);
    const coloradoCoverage = buildColoradoCountyCoverageSummary(demandRecords, deficitMeta);

    return NextResponse.json({
      ok: true,
      summary,
      records,
      questions,
      setup,
      coloradoCoverage,
      baselineMeta: deficitMeta,
      meta: { fromCache, recordCount: records.length },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "data confidence failed", detail }, { status: 500 });
  }
}
