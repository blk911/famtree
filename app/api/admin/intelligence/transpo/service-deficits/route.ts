export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { readDataConfidenceCache } from "@/lib/intelligence/transpo/data-confidence/confidence-store";
import { mergeConfidenceIntoDeficits } from "@/lib/intelligence/transpo/data-confidence/data-confidence-engine";
import { readCountyDemandCache } from "@/lib/intelligence/transpo/demand/demand-store";
import { buildColoradoCountyCoverageSummary } from "@/lib/intelligence/transpo/payers/payer-engine";
import { buildAndPersistServiceDeficits } from "@/lib/intelligence/transpo/service-deficits/build-service-deficits";
import { buildTranspoServiceDeficitQuestions, buildTranspoServiceDeficitSummary } from "@/lib/intelligence/transpo/service-deficits/deficit-summary";
import { readServiceDeficitCache, readServiceDeficitCacheMeta } from "@/lib/intelligence/transpo/service-deficits/deficit-store";
import type { TranspoServiceDeficitBuildMode } from "@/lib/intelligence/transpo/service-deficits/deficit-types";

function parseMode(value: string | null): TranspoServiceDeficitBuildMode {
  return value === "observed" ? "observed" : "colorado_baseline";
}

export async function GET(request: NextRequest) {
  try {
    const mode = parseMode(request.nextUrl.searchParams.get("mode"));
    let records = await readServiceDeficitCache();
    let meta = await readServiceDeficitCacheMeta();
    const fromCache = records.length > 0 && meta?.mode === mode;

    if (!fromCache) {
      const built = await buildAndPersistServiceDeficits(mode);
      records = built.records;
      meta = {
        mode: built.mode,
        countiesEvaluated: built.countiesEvaluated,
        expectedColoradoCounties: built.expectedColoradoCounties,
        countyServiceRows: built.countyServiceRows,
        zeroProviderRows: built.zeroProviderRows,
        criticalZeroProviderRows: built.criticalZeroProviderRows,
        baselineRows: built.baselineRows,
        observedRows: built.observedRows,
        updatedAt: new Date().toISOString(),
      };
    } else if (!records.some((r) => r.dataConfidence)) {
      const confidence = await readDataConfidenceCache();
      if (confidence.length > 0) {
        records = mergeConfidenceIntoDeficits(records, confidence);
      }
    }

    const summary = buildTranspoServiceDeficitSummary(records);
    const questions = buildTranspoServiceDeficitQuestions(records, summary, meta);
    const demandRecords = await readCountyDemandCache();
    const coloradoCoverage = buildColoradoCountyCoverageSummary(
      demandRecords.length > 0 ? demandRecords : records.map((r) => r.demand),
      meta,
    );

    return NextResponse.json({
      ok: true,
      mode: meta?.mode ?? mode,
      countiesEvaluated: meta?.countiesEvaluated ?? 0,
      expectedColoradoCounties: meta?.expectedColoradoCounties ?? 64,
      countyServiceRows: meta?.countyServiceRows ?? records.length,
      zeroProviderRows: meta?.zeroProviderRows ?? records.filter((r) => r.providerCount === 0).length,
      criticalZeroProviderRows:
        meta?.criticalZeroProviderRows ??
        records.filter((r) => r.providerCount === 0 && (r.severity === "critical" || r.severity === "high")).length,
      baselineRows: meta?.baselineRows,
      observedRows: meta?.observedRows,
      summary,
      records,
      questions,
      coloradoCoverage,
      meta: { fromCache, recordCount: records.length },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "service deficits failed", detail }, { status: 500 });
  }
}
