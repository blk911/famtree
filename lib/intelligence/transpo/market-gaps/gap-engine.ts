// lib/intelligence/transpo/market-gaps/gap-engine.ts
// v1 market gap analysis — compares carrier supply heuristics to location demand
// placeholders. Does not mutate carrier master or change opportunity scoring.

import {
  classifyProviderServiceCategory as classifyCarrierServiceCategory,
} from "../provider-classification-engine";
import type { TranspoCarrierTarget } from "../types";
import type { TranspoCarrierVerification } from "../verification-types";
import {
  SERVICE_CATEGORY_LABELS,
  TRANSPO_SERVICE_CATEGORIES,
  type TranspoGapSeverity,
  type TranspoMarketGapRecord,
  type TranspoRurality,
  type TranspoServiceCategory,
} from "./types";

export { classifyCarrierServiceCategory };

export type BuildMarketGapsInput = {
  carriers: TranspoCarrierTarget[];
  verifications?: TranspoCarrierVerification[];
};

const FRONTIER_STATES = new Set(["WY", "MT", "ND", "SD", "AK", "NM", "ID", "NE", "KS", "OK", "AR", "MS", "WV"]);
const RURAL_STATE_HINTS = new Set(["WY", "MT", "ND", "SD", "AK", "VT", "ME", "WV", "ID", "NM"]);

function isActiveAuthority(status?: string): boolean {
  const s = (status ?? "").trim().toLowerCase();
  if (!s) return false;
  return s === "a" || s.includes("active") || s.includes("authorized");
}

function isVerified(v?: TranspoCarrierVerification): boolean {
  return v?.verificationStatus === "verified" || (v?.verificationScore ?? 0) >= 60;
}

export function inferRurality(state: string, city: string, carrierCount: number): TranspoRurality {
  const st = state.trim().toUpperCase();
  const cityLower = city.trim().toLowerCase();

  if (FRONTIER_STATES.has(st) && (!cityLower || carrierCount <= 2)) return "frontier";
  if (RURAL_STATE_HINTS.has(st) && carrierCount <= 3) return "rural";
  if (/county|rural|mesa|pueblo|farm|frontier|reservation/i.test(cityLower)) return "rural";
  if (!cityLower) return "unknown";
  if (["denver", "aurora", "colorado springs", "fort collins", "boulder", "lakewood"].includes(cityLower)) {
    return "urban";
  }
  if (carrierCount >= 8) return "urban";
  if (carrierCount >= 3) return "suburban";
  return "suburban";
}

export function supplyScoreFromCounts(carrierCount: number): number {
  if (carrierCount >= 25) return 80;
  if (carrierCount >= 10) return 60;
  if (carrierCount >= 5) return 40;
  if (carrierCount >= 1) return 20;
  return 0;
}

export function demandScoreFromHeuristics(
  serviceCategory: TranspoServiceCategory,
  rurality: TranspoRurality,
): number {
  let score = 60;
  if (rurality === "rural") score = 75;
  else if (rurality === "frontier") score = 85;
  else if (rurality === "suburban") score = 60;
  else if (rurality === "urban") score = 55;
  else score = 60;

  if (serviceCategory === "nemt" || serviceCategory === "senior_transport" || serviceCategory === "meal_delivery") {
    score += 10;
  }
  if (serviceCategory === "veteran_transport") score += 5;
  if (serviceCategory === "medical_transport") score += 8;
  if (serviceCategory === "rural_transit" && (rurality === "rural" || rurality === "frontier")) score += 10;

  return Math.min(100, score);
}

export function gapScoreFromSupplyDemand(supplyScore: number, demandScore: number): number {
  return Math.max(0, Math.min(100, demandScore - supplyScore + 25));
}

export function severityFromGapScore(gapScore: number): TranspoGapSeverity {
  if (gapScore >= 75) return "critical";
  if (gapScore >= 50) return "high";
  if (gapScore >= 25) return "medium";
  return "low";
}

export function recommendedPlayForGap(
  serviceCategory: TranspoServiceCategory,
  severity: TranspoGapSeverity,
  dataLimited: boolean,
): string {
  if (dataLimited) {
    return "Connect population, Medicaid, senior, veteran, and food-access datasets.";
  }
  const high = severity === "high" || severity === "critical";
  if (serviceCategory === "nemt" && high) {
    return "Investigate NEMT provider entry or subcontractor acquisition.";
  }
  if (serviceCategory === "meal_delivery" && high) {
    return "Investigate approved meal delivery vendor opportunity.";
  }
  if (serviceCategory === "senior_transport") {
    return "Investigate senior mobility / assisted living transport partnership.";
  }
  if (serviceCategory === "veteran_transport") {
    return "Investigate VA/community veteran transport coverage.";
  }
  if (serviceCategory === "medical_transport" && high) {
    return "Investigate medical transport coverage and clinic/hospital routing partners.";
  }
  if (serviceCategory === "rural_transit" && high) {
    return "Investigate rural/community transit service expansion.";
  }
  if (serviceCategory === "general_carrier" && high) {
    return "Investigate transportation coverage deficit and provider count.";
  }
  return "Monitor supply/demand balance and validate with local demand datasets.";
}

type MarketBucket = {
  state: string;
  city: string;
  serviceCategory: TranspoServiceCategory;
  carriers: TranspoCarrierTarget[];
  verifications: TranspoCarrierVerification[];
};

function marketKey(state: string, city: string, category: TranspoServiceCategory): string {
  return `${state.trim().toUpperCase()}|${city.trim().toLowerCase()}|${category}`;
}

function buildMarketLabel(state: string, city: string, category: TranspoServiceCategory): string {
  const place = city.trim() ? `${city.trim()}, ${state.trim().toUpperCase()}` : state.trim().toUpperCase();
  return `${place} — ${SERVICE_CATEGORY_LABELS[category]}`;
}

function buildReasons(
  carrierCount: number,
  verifiedCarrierCount: number,
  activeAuthorityCount: number,
  rurality: TranspoRurality,
  serviceCategory: TranspoServiceCategory,
): string[] {
  const reasons: string[] = [];
  if (carrierCount === 0) reasons.push("No carriers classified for this service category in market.");
  else if (carrierCount < 5) reasons.push("Sparse carrier supply for this service category.");
  if (verifiedCarrierCount === 0 && carrierCount > 0) {
    reasons.push("Carriers present but none verified — coverage may be unproven.");
  } else if (verifiedCarrierCount < Math.max(1, Math.floor(carrierCount / 2))) {
    reasons.push("Verified provider count is weak relative to total carriers.");
  }
  if (activeAuthorityCount < carrierCount) {
    reasons.push("Some carriers lack active authority signals.");
  }
  if (rurality === "rural" || rurality === "frontier") {
    reasons.push(`${rurality} market — higher baseline demand heuristic applied.`);
  }
  if (serviceCategory !== "general_carrier") {
    reasons.push(`Specialized ${SERVICE_CATEGORY_LABELS[serviceCategory]} coverage assessed separately from general freight.`);
  }
  return reasons;
}

function buildEvidence(
  carrierCount: number,
  rurality: TranspoRurality,
  dataLimited: boolean,
): string[] {
  const evidence: string[] = [
    `Carrier supply counted from carrier master (${carrierCount} in category).`,
    `Rurality inferred as ${rurality} from state/city and local carrier density.`,
  ];
  if (dataLimited) {
    evidence.push(
      "Demand score uses v1 heuristic until population/Medicaid/senior datasets are connected.",
    );
  }
  return evidence;
}

export function buildTranspoMarketGapRecords(input: BuildMarketGapsInput): TranspoMarketGapRecord[] {
  const verificationByCarrier = new Map(
    (input.verifications ?? []).map((v) => [v.carrierId ?? v.carrierKey, v]),
  );

  const locationKeys = new Set<string>();
  for (const carrier of input.carriers) {
    const state = (carrier.state ?? "").trim().toUpperCase();
    if (!state) continue;
    const city = (carrier.city ?? "").trim();
    locationKeys.add(`${state}|${city}`);
  }

  if (locationKeys.size === 0 && input.carriers.length > 0) {
    locationKeys.add("UNKNOWN|");
  }

  const buckets = new Map<string, MarketBucket>();

  for (const loc of Array.from(locationKeys)) {
    const [state, city] = loc.split("|");
    for (const category of TRANSPO_SERVICE_CATEGORIES) {
      buckets.set(marketKey(state, city, category), {
        state,
        city,
        serviceCategory: category,
        carriers: [],
        verifications: [],
      });
    }
  }

  for (const carrier of input.carriers) {
    const state = (carrier.state ?? "UNKNOWN").trim().toUpperCase();
    const city = (carrier.city ?? "").trim();
    const verification = verificationByCarrier.get(carrier.id);
    const category = classifyCarrierServiceCategory(carrier, verification);
    const key = marketKey(state, city, category);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { state, city, serviceCategory: category, carriers: [], verifications: [] };
      buckets.set(key, bucket);
    }
    bucket.carriers.push(carrier);
    if (verification) bucket.verifications.push(verification);
  }

  const now = new Date().toISOString();
  const records: TranspoMarketGapRecord[] = [];

  for (const bucket of Array.from(buckets.values())) {
    const carrierCount = bucket.carriers.length;
    const activeAuthorityCount = bucket.carriers.filter((c: TranspoCarrierTarget) =>
      isActiveAuthority(c.authorityStatus),
    ).length;
    const verifiedCarrierCount = bucket.verifications.filter(isVerified).length;
    const fleetCount = bucket.carriers.reduce((s: number, c: TranspoCarrierTarget) => s + (c.fleetSize ?? 0), 0) || undefined;
    const driverCount = bucket.carriers.reduce((s: number, c: TranspoCarrierTarget) => s + (c.driverCount ?? 0), 0) || undefined;

    const rurality = inferRurality(bucket.state, bucket.city, carrierCount);
    const dataLimited = true;
    const supplyScore = supplyScoreFromCounts(carrierCount);
    const demandScore = demandScoreFromHeuristics(bucket.serviceCategory, rurality);
    const gapScore = gapScoreFromSupplyDemand(supplyScore, demandScore);
    const severity = severityFromGapScore(gapScore);

    const id = `gap-${bucket.state}-${bucket.city || "statewide"}-${bucket.serviceCategory}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    records.push({
      id,
      state: bucket.state,
      city: bucket.city || undefined,
      marketLabel: buildMarketLabel(bucket.state, bucket.city, bucket.serviceCategory),
      serviceCategory: bucket.serviceCategory,
      carrierCount,
      activeAuthorityCount,
      verifiedCarrierCount,
      fleetCount: fleetCount && fleetCount > 0 ? fleetCount : undefined,
      driverCount: driverCount && driverCount > 0 ? driverCount : undefined,
      demandSignals: { rurality },
      supplyScore,
      demandScore,
      gapScore,
      severity,
      reasons: buildReasons(
        carrierCount,
        verifiedCarrierCount,
        activeAuthorityCount,
        rurality,
        bucket.serviceCategory,
      ),
      recommendedPlay: recommendedPlayForGap(bucket.serviceCategory, severity, dataLimited),
      evidence: buildEvidence(carrierCount, rurality, dataLimited),
      createdAt: now,
      updatedAt: now,
    });
  }

  records.sort((a, b) => b.gapScore - a.gapScore || b.demandScore - a.demandScore);
  return records;
}
