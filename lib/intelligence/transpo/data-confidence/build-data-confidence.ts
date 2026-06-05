// lib/intelligence/transpo/data-confidence/build-data-confidence.ts

import { readCarrierMaster } from "../carrier-master-store";
import { readCountyDemandCache } from "../demand/demand-store";
import { readPayerCache } from "../payers/payer-store";
import { readRuns } from "../sources/source-runs-store";
import type { TranspoServiceDeficitRecord } from "../service-deficits/deficit-types";
import { readServiceDeficitCache, writeServiceDeficitCache } from "../service-deficits/deficit-store";
import { readCarrierVerifications } from "../verification-store";
import { writeDataConfidenceCache } from "./confidence-store";
import {
  buildLiveDataSetupStatus,
  buildTranspoDataConfidenceRecords,
  mergeConfidenceIntoDeficits,
  type DataConfidenceContext,
} from "./data-confidence-engine";
import type { TranspoDataConfidenceRecord, TranspoLiveDataSetupStatus } from "./data-confidence-types";

export type DataConfidenceBuildResult = {
  recordsBuilt: number;
  high: number;
  medium: number;
  low: number;
  experimental: number;
  byCarrierSupply: Record<string, number>;
  byDemand: Record<string, number>;
  byPayer: Record<string, number>;
  records: TranspoDataConfidenceRecord[];
  deficitsUpdated: number;
  setup: TranspoLiveDataSetupStatus;
  persistWarnings: string[];
};

async function loadContext(): Promise<DataConfidenceContext> {
  const [carriers, verifications, sourceRuns, demandFromCache, payersFromCache] =
    await Promise.all([
      readCarrierMaster(),
      readCarrierVerifications(),
      readRuns(),
      readCountyDemandCache(),
      readPayerCache(),
    ]);

  return {
    carriers,
    verifications,
    sourceRuns,
    demandRecords: demandFromCache,
    payers: payersFromCache,
  };
}

function countByStatus(
  records: TranspoDataConfidenceRecord[],
  field: keyof Pick<
    TranspoDataConfidenceRecord,
    "carrierSupplyStatus" | "demandStatus" | "payerStatus"
  >,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records) {
    const k = r[field];
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export async function buildAndPersistDataConfidence(
  deficitsInput?: TranspoServiceDeficitRecord[],
  options?: { persistDeficits?: boolean },
): Promise<DataConfidenceBuildResult> {
  const ctx = await loadContext();
  const deficits = deficitsInput ?? (await readServiceDeficitCache());
  const confidenceRecords = buildTranspoDataConfidenceRecords(deficits, ctx);
  const mergedDeficits = mergeConfidenceIntoDeficits(deficits, confidenceRecords);
  const setup = await buildLiveDataSetupStatus(ctx);

  const persistWarnings: string[] = [];
  const w1 = await writeDataConfidenceCache(confidenceRecords);
  if (w1) persistWarnings.push(`confidence: ${w1}`);

  if (options?.persistDeficits !== false && mergedDeficits.length > 0) {
    const w2 = await writeServiceDeficitCache(mergedDeficits);
    if (w2) persistWarnings.push(`deficits: ${w2}`);
  }

  return {
    recordsBuilt: confidenceRecords.length,
    high: confidenceRecords.filter((r) => r.confidenceGrade === "high").length,
    medium: confidenceRecords.filter((r) => r.confidenceGrade === "medium").length,
    low: confidenceRecords.filter((r) => r.confidenceGrade === "low").length,
    experimental: confidenceRecords.filter((r) => r.confidenceGrade === "experimental").length,
    byCarrierSupply: countByStatus(confidenceRecords, "carrierSupplyStatus"),
    byDemand: countByStatus(confidenceRecords, "demandStatus"),
    byPayer: countByStatus(confidenceRecords, "payerStatus"),
    records: confidenceRecords,
    deficitsUpdated: mergedDeficits.length,
    setup,
    persistWarnings,
  };
}
