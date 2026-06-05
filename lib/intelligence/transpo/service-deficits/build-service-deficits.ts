// lib/intelligence/transpo/service-deficits/build-service-deficits.ts

import { readCarrierMaster } from "../carrier-master-store";
import { readCarrierVerifications } from "../verification-store";
import { buildTranspoCoverageRecords } from "../coverage/coverage-engine";
import { buildCountyDemandRecords } from "../demand/county-demand-engine";
import { writeCountyDemandCache } from "../demand/demand-store";
import { buildTranspoPayerRecords } from "../payers/payer-engine";
import { writePayerCache } from "../payers/payer-store";
import { buildAndPersistDataConfidence } from "../data-confidence/build-data-confidence";
import { buildTranspoServiceDeficitRecords } from "./deficit-engine";
import { writeServiceDeficitCache } from "./deficit-store";
import type { TranspoServiceDeficitRecord } from "./deficit-types";

export type ServiceDeficitBuildResult = {
  checkedCarriers: number;
  recordsBuilt: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  records: TranspoServiceDeficitRecord[];
  persistWarnings: string[];
};

export async function buildAndPersistServiceDeficits(): Promise<ServiceDeficitBuildResult> {
  const [carriers, verifications] = await Promise.all([
    readCarrierMaster(),
    readCarrierVerifications(),
  ]);

  const demandRecords = await buildCountyDemandRecords(carriers);
  const payers = buildTranspoPayerRecords(demandRecords);
  const coverageRecords = buildTranspoCoverageRecords({
    carriers,
    verifications,
    demandRecords,
  });
  const records = buildTranspoServiceDeficitRecords({
    demandRecords,
    coverageRecords,
    payers,
  });

  const persistWarnings: string[] = [];
  const w1 = await writeCountyDemandCache(demandRecords);
  const w2 = await writePayerCache(payers);
  if (w1) persistWarnings.push(`demand: ${w1}`);
  if (w2) persistWarnings.push(`payers: ${w2}`);

  const confidenceResult = await buildAndPersistDataConfidence(records, { persistDeficits: false });
  const { mergeConfidenceIntoDeficits } = await import("../data-confidence/data-confidence-engine");
  const finalRecords =
    confidenceResult.records.length > 0
      ? mergeConfidenceIntoDeficits(records, confidenceResult.records)
      : records;
  const w3 = await writeServiceDeficitCache(finalRecords);
  if (w3) persistWarnings.push(`deficits: ${w3}`);
  if (confidenceResult.persistWarnings.length) {
    persistWarnings.push(...confidenceResult.persistWarnings);
  }

  const critical = finalRecords.filter((r) => r.severity === "critical").length;
  const high = finalRecords.filter((r) => r.severity === "high").length;
  const medium = finalRecords.filter((r) => r.severity === "medium").length;
  const low = finalRecords.filter((r) => r.severity === "low").length;

  return {
    checkedCarriers: carriers.length,
    recordsBuilt: finalRecords.length,
    critical,
    high,
    medium,
    low,
    records: finalRecords,
    persistWarnings,
  };
}
