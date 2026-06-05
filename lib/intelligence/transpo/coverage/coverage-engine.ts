// lib/intelligence/transpo/coverage/coverage-engine.ts

import { resolveCountyFromCityState } from "../demand/census-adapter";
import type { TranspoCountyDemandRecord } from "../demand/demand-types";
import { TRANSPO_SERVICE_CATEGORIES, type TranspoServiceCategory } from "../market-gaps/types";
import { classifyProviderServiceCategory } from "../provider-classification-engine";
import type { TranspoCarrierTarget } from "../types";
import type { TranspoCarrierVerification } from "../verification-types";
import type { TranspoCoverageRecord } from "./coverage-types";

function isVerified(v?: TranspoCarrierVerification): boolean {
  return v?.verificationStatus === "verified" || (v?.verificationScore ?? 0) >= 60;
}

export function coverageScoreFromCounts(
  providerCount: number,
  verifiedCount: number,
  fleetCapacity: number,
  driverCapacity: number,
): number {
  let score = 0;
  if (providerCount >= 20) score += 35;
  else if (providerCount >= 10) score += 28;
  else if (providerCount >= 5) score += 20;
  else if (providerCount >= 1) score += 10;

  if (verifiedCount >= 10) score += 25;
  else if (verifiedCount >= 5) score += 18;
  else if (verifiedCount >= 1) score += 10;

  if (fleetCapacity >= 100) score += 20;
  else if (fleetCapacity >= 30) score += 14;
  else if (fleetCapacity >= 10) score += 8;
  else if (fleetCapacity >= 1) score += 4;

  if (driverCapacity >= 50) score += 20;
  else if (driverCapacity >= 15) score += 12;
  else if (driverCapacity >= 5) score += 6;

  return Math.max(0, Math.min(100, score));
}

type Bucket = {
  state: string;
  county: string;
  countyFips?: string;
  serviceCategory: TranspoServiceCategory;
  providers: TranspoCarrierTarget[];
  verifications: TranspoCarrierVerification[];
};

export function buildTranspoCoverageRecords(input: {
  carriers: TranspoCarrierTarget[];
  verifications?: TranspoCarrierVerification[];
  demandRecords: TranspoCountyDemandRecord[];
}): TranspoCoverageRecord[] {
  const verificationByCarrier = new Map(
    (input.verifications ?? []).map((v) => [v.carrierId ?? "", v]),
  );

  const demandByFips = new Map(input.demandRecords.map((d) => [d.countyFips, d]));
  const buckets = new Map<string, Bucket>();

  for (const county of input.demandRecords) {
    for (const category of TRANSPO_SERVICE_CATEGORIES) {
      const key = `${county.state}|${county.county}|${category}`;
      buckets.set(key, {
        state: county.state,
        county: county.county,
        countyFips: county.countyFips,
        serviceCategory: category,
        providers: [],
        verifications: [],
      });
    }
  }

  for (const carrier of input.carriers) {
    const state = (carrier.state ?? "").trim().toUpperCase();
    const city = (carrier.city ?? "").trim();
    if (!state) continue;
    const resolved = resolveCountyFromCityState(state, city);
    const county = resolved?.county ?? "Unknown";
    const countyFips = resolved?.countyFips;
    const verification = verificationByCarrier.get(carrier.id);
    const category = classifyProviderServiceCategory(carrier, verification);
    const key = `${state}|${county}|${category}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { state, county, countyFips, serviceCategory: category, providers: [], verifications: [] };
      buckets.set(key, bucket);
    }
    bucket.providers.push(carrier);
    if (verification) bucket.verifications.push(verification);
    void demandByFips;
  }

  const records: TranspoCoverageRecord[] = [];
  for (const bucket of Array.from(buckets.values())) {
    const fleetCapacity = bucket.providers.reduce((s, c) => s + (c.fleetSize ?? 0), 0);
    const driverCapacity = bucket.providers.reduce((s, c) => s + (c.driverCount ?? 0), 0);
    const verifiedProviderCount = bucket.verifications.filter(isVerified).length;
    const providerCount = bucket.providers.length;
    const coverageScore = coverageScoreFromCounts(
      providerCount,
      verifiedProviderCount,
      fleetCapacity,
      driverCapacity,
    );
    records.push({
      state: bucket.state,
      county: bucket.county,
      countyFips: bucket.countyFips,
      serviceCategory: bucket.serviceCategory,
      providerCount,
      verifiedProviderCount,
      fleetCapacity,
      driverCapacity,
      coverageScore,
      evidence: [
        `${providerCount} providers classified as ${bucket.serviceCategory}.`,
        `${verifiedProviderCount} verified providers.`,
        `Fleet capacity ${fleetCapacity}, driver capacity ${driverCapacity}.`,
      ],
    });
  }

  records.sort((a, b) => a.coverageScore - b.coverageScore);
  return records;
}
