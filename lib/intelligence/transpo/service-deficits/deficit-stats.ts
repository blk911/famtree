// lib/intelligence/transpo/service-deficits/deficit-stats.ts

import { COLORADO_COUNTY_TOTAL } from "../demand/colorado-county-baseline";
import { TRANSPO_SERVICE_CATEGORIES } from "../market-gaps/types";
import type { TranspoServiceDeficitBuildMode, TranspoServiceDeficitCacheMeta, TranspoServiceDeficitRecord } from "./deficit-types";

export function computeServiceDeficitStats(
  records: TranspoServiceDeficitRecord[],
  mode: TranspoServiceDeficitBuildMode,
): Omit<TranspoServiceDeficitCacheMeta, "updatedAt"> {
  const coCounties = new Set(
    records.filter((r) => r.state === "CO").map((r) => r.county),
  );
  const zeroProviderRows = records.filter((r) => r.providerCount === 0).length;
  const criticalZeroProviderRows = records.filter(
    (r) => r.providerCount === 0 && (r.severity === "critical" || r.severity === "high"),
  ).length;
  const baselineRows = records.filter((r) => r.baselineGenerated).length;
  const observedRows = records.length - baselineRows;

  return {
    mode,
    countiesEvaluated: mode === "colorado_baseline" ? coCounties.size : coCounties.size,
    expectedColoradoCounties: COLORADO_COUNTY_TOTAL,
    countyServiceRows: records.length,
    zeroProviderRows,
    criticalZeroProviderRows,
    baselineRows,
    observedRows,
  };
}

export const EXPECTED_COLORADO_BASELINE_ROWS =
  COLORADO_COUNTY_TOTAL * TRANSPO_SERVICE_CATEGORIES.length;
