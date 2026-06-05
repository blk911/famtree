// lib/intelligence/transpo/data-confidence/data-confidence-engine.ts

import { resolveCountyFromCityState } from "../demand/census-adapter";
import type { TranspoCountyDemandRecord } from "../demand/demand-types";
import type { TranspoPayerRecord } from "../payers/payer-types";
import type { TranspoServiceDeficitRecord } from "../service-deficits/deficit-types";
import type { TranspoCarrierTarget, TranspoSourceRun } from "../types";
import type { TranspoCarrierVerification } from "../verification-types";
import type {
  TranspoConfidenceGrade,
  TranspoDataConfidenceRecord,
  TranspoDataSourceStatus,
  TranspoLiveDataSetupStatus,
  TranspoServiceDeficitDataConfidence,
} from "./data-confidence-types";

const LIVE_WEIGHTS = {
  carrierSupply: 25,
  verification: 20,
  demand: 20,
  payer: 20,
  revenue: 15,
} as const;

const STATUS_MULTIPLIER: Record<TranspoDataSourceStatus, number> = {
  live: 1,
  seeded: 0.5,
  heuristic: 0.25,
  missing: 0,
  error: 0,
};

const MISSING_PENALTY = 8;
const ERROR_PENALTY = 10;

export type DataConfidenceContext = {
  carriers: TranspoCarrierTarget[];
  verifications: TranspoCarrierVerification[];
  sourceRuns: TranspoSourceRun[];
  demandRecords: TranspoCountyDemandRecord[];
  payers: TranspoPayerRecord[];
};

type LayerSignals = {
  status: TranspoDataSourceStatus;
  liveSignals: string[];
  seededSignals: string[];
  heuristicSignals: string[];
  missingSignals: string[];
  errors: string[];
};

function emptySignals(): LayerSignals {
  return {
    status: "missing",
    liveSignals: [],
    seededSignals: [],
    heuristicSignals: [],
    missingSignals: [],
    errors: [],
  };
}

export function gradeFromScore(score: number): TranspoConfidenceGrade {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  if (score >= 40) return "low";
  return "experimental";
}

export function confidenceScoreFromLayers(layers: {
  carrierSupply: TranspoDataSourceStatus;
  verification: TranspoDataSourceStatus;
  demand: TranspoDataSourceStatus;
  payer: TranspoDataSourceStatus;
  revenue: TranspoDataSourceStatus;
}): number {
  let score =
    LIVE_WEIGHTS.carrierSupply * STATUS_MULTIPLIER[layers.carrierSupply] +
    LIVE_WEIGHTS.verification * STATUS_MULTIPLIER[layers.verification] +
    LIVE_WEIGHTS.demand * STATUS_MULTIPLIER[layers.demand] +
    LIVE_WEIGHTS.payer * STATUS_MULTIPLIER[layers.payer] +
    LIVE_WEIGHTS.revenue * STATUS_MULTIPLIER[layers.revenue];

  for (const s of Object.values(layers)) {
    if (s === "missing") score -= MISSING_PENALTY;
    if (s === "error") score -= ERROR_PENALTY;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function hasLiveVerificationSignal(v: TranspoCarrierVerification): boolean {
  if (v.verificationStatus === "error") return false;
  if (v.googleFound && (v.googlePlaceId || v.googleMapsUrl)) return true;
  if (v.websiteFetchStatus === "fetched" || v.websiteFetchStatus === "partial") return true;
  if (v.stateRegistryProvider === "colorado_sos" && v.stateEntityFound) return true;
  return false;
}

function carriersInMarket(
  carriers: TranspoCarrierTarget[],
  state: string,
  county: string,
): TranspoCarrierTarget[] {
  const st = state.trim().toUpperCase();
  const co = county.trim().toLowerCase();
  return carriers.filter((c) => {
    const cState = (c.state ?? "").trim().toUpperCase();
    if (cState !== st) return false;
    const city = (c.city ?? "").trim();
    if (!city) return true;
    const resolved = resolveCountyFromCityState(cState, city);
    if (!resolved) return true;
    return resolved.county.toLowerCase() === co;
  });
}

export function detectCarrierSupplyStatus(
  carriers: TranspoCarrierTarget[],
  sourceRuns: TranspoSourceRun[],
): LayerSignals {
  const out = emptySignals();
  if (carriers.length === 0) {
    out.status = "missing";
    out.missingSignals.push("No carriers in master store");
    return out;
  }

  const hasLiveRun = sourceRuns.some(
    (r) => r.providerKind === "live" || r.sourceMode === "live_api",
  );
  const hasMockRun = sourceRuns.some(
    (r) => r.providerKind === "mock" || r.sourceMode === "mock_fmcsa_test",
  );
  const hasCsvRun = sourceRuns.some((r) => r.sourceMode === "csv_import");
  const envLive = (process.env.TRANSPO_FMCSA_PROVIDER ?? "").trim().toLowerCase() === "live";
  const hasFmcsaSource = carriers.some((c) => c.sources.includes("fmcsa"));

  if (hasLiveRun || envLive) {
    out.status = "live";
    if (hasLiveRun) out.liveSignals.push("FMCSA source run provider=live");
    if (envLive) out.liveSignals.push("TRANSPO_FMCSA_PROVIDER=live");
    if (hasFmcsaSource) out.liveSignals.push(`${carriers.length} carriers with FMCSA source`);
    return out;
  }

  if (hasMockRun) {
    out.status = "seeded";
    out.seededSignals.push("FMCSA mock/test provider");
    out.seededSignals.push(`${carriers.length} promoted carriers`);
    return out;
  }

  if (hasCsvRun) {
    out.status = "seeded";
    out.seededSignals.push("FMCSA CSV import");
    return out;
  }

  out.status = "seeded";
  out.seededSignals.push(`${carriers.length} carriers without live FMCSA provenance`);
  return out;
}

export function detectVerificationStatusForMarket(
  carriers: TranspoCarrierTarget[],
  verifications: TranspoCarrierVerification[],
  state: string,
  county: string,
): LayerSignals {
  const out = emptySignals();
  const marketCarriers = carriersInMarket(carriers, state, county);
  const carrierIds = new Set(marketCarriers.map((c) => c.id));
  const marketVerifications = verifications.filter((v) => carrierIds.has(v.carrierId));

  if (marketVerifications.length === 0 && verifications.length === 0) {
    out.status = "missing";
    out.missingSignals.push("No verification records");
    return out;
  }

  const pool = marketVerifications.length > 0 ? marketVerifications : verifications;
  const errors = pool.filter((v) => v.verificationStatus === "error");
  if (errors.length > 0 && errors.length === pool.length) {
    out.status = "error";
    out.errors.push(`${errors.length} verification error(s)`);
    return out;
  }

  const liveHits = pool.filter(hasLiveVerificationSignal);
  if (liveHits.length > 0) {
    out.status = "live";
    if (liveHits.some((v) => v.googleFound)) out.liveSignals.push("Google Business matches");
    if (liveHits.some((v) => v.websiteFetchStatus === "fetched" || v.websiteFetchStatus === "partial")) {
      out.liveSignals.push("Website crawl signals");
    }
    if (liveHits.some((v) => v.stateRegistryProvider === "colorado_sos" && v.stateEntityFound)) {
      out.liveSignals.push("Colorado SOS registry match");
    }
    return out;
  }

  const placeholders = pool.filter((v) => v.verificationStatus === "placeholder");
  if (placeholders.length > 0) {
    out.status = "heuristic";
    out.heuristicSignals.push("Verification providers not fully connected (placeholder mode)");
    return out;
  }

  if (pool.length > 0) {
    out.status = "heuristic";
    out.heuristicSignals.push(`${pool.length} verification record(s) without live provider hits`);
    return out;
  }

  out.status = "missing";
  out.missingSignals.push("No verification for market carriers");
  return out;
}

export function detectDemandStatus(demand?: TranspoCountyDemandRecord): LayerSignals {
  const out = emptySignals();
  if (!demand) {
    out.status = "missing";
    out.missingSignals.push("No county demand record");
    return out;
  }

  const sources = demand.sources ?? [];
  const hasLiveAcs = sources.some(
    (s) => s.includes("acs_live") || s === "census_acs_api" || s.includes("census_api"),
  );
  if (hasLiveAcs) {
    out.status = "live";
    out.liveSignals.push("Live Census/ACS county demographics");
    return out;
  }

  const hasPlaceholder = sources.some(
    (s) => s.includes("placeholder") || s.includes("census_adapter"),
  );
  const hasHeuristic = sources.some((s) => s.includes("heuristic"));

  if (hasPlaceholder && !hasHeuristic) {
    out.status = "seeded";
    out.seededSignals.push("Colorado county census seeds");
    if (demand.population === 25000) out.heuristicSignals.push("Carrier-inferred county population default");
    return out;
  }

  if (hasPlaceholder && hasHeuristic) {
    out.status = "seeded";
    out.seededSignals.push("CO county seed demographics");
    out.heuristicSignals.push("ACS demographic heuristics");
    return out;
  }

  if (hasHeuristic) {
    out.status = "heuristic";
    out.heuristicSignals.push("Inferred demographics only");
    return out;
  }

  out.status = "seeded";
  out.seededSignals.push("County demand from adapter");
  return out;
}

export function detectPayerStatus(
  payers: TranspoPayerRecord[],
  state: string,
  county: string,
): LayerSignals {
  const out = emptySignals();
  const st = state.trim().toUpperCase();
  const co = county.trim().toLowerCase();
  const marketPayers = payers.filter(
    (p) =>
      p.state === st &&
      (p.region.toLowerCase() === co ||
        p.region === "Statewide" ||
        p.region === "Rural CO" ||
        p.region === "Denver Metro"),
  );

  if (marketPayers.length === 0) {
    out.status = "missing";
    out.missingSignals.push("No payer coverage for market");
    return out;
  }

  const livePayers = marketPayers.filter(
    (p) => p.notes && !p.notes.toLowerCase().includes("placeholder"),
  );
  if (livePayers.length > 0) {
    out.status = "live";
    out.liveSignals.push(`${livePayers.length} external payer registry record(s)`);
    return out;
  }

  out.status = "seeded";
  out.seededSignals.push(`${marketPayers.length} seeded payer/program record(s)`);
  return out;
}

export function detectRevenueStatus(
  demandStatus: TranspoDataSourceStatus,
  payerStatus: TranspoDataSourceStatus,
  carrierStatus: TranspoDataSourceStatus,
  verificationStatus: TranspoDataSourceStatus,
  hasOpportunity: boolean,
): LayerSignals {
  const out = emptySignals();
  if (!hasOpportunity) {
    out.status = "missing";
    out.missingSignals.push("Revenue opportunity not computed");
    return out;
  }

  const supplyLive = carrierStatus === "live" || verificationStatus === "live";
  if (demandStatus === "live" && payerStatus === "live" && supplyLive) {
    out.status = "live";
    out.liveSignals.push("Evidence-backed revenue estimate (live demand + payer + supply)");
    return out;
  }

  out.status = "heuristic";
  out.heuristicSignals.push("v1 opportunity formula from deficit components");
  return out;
}

export function recommendNextDataSource(layers: {
  carrierSupply: TranspoDataSourceStatus;
  verification: TranspoDataSourceStatus;
  demand: TranspoDataSourceStatus;
  payer: TranspoDataSourceStatus;
  revenue: TranspoDataSourceStatus;
}): string | undefined {
  if (layers.carrierSupply === "missing" || layers.carrierSupply === "seeded") {
    return "FMCSA live provider + carrier promotion";
  }
  if (layers.verification === "missing" || layers.verification === "heuristic") {
    return "Google Maps API + website crawl + Colorado SOS verification";
  }
  if (layers.demand === "missing" || layers.demand === "seeded" || layers.demand === "heuristic") {
    return "Census/ACS live county demand API";
  }
  if (layers.payer === "missing" || layers.payer === "seeded") {
    return "Medicaid/NEMT payer and provider registry";
  }
  if (layers.revenue === "heuristic") {
    return "Connect live demand + payer to upgrade revenue confidence";
  }
  return undefined;
}

export function buildConfidenceForDeficit(
  deficit: TranspoServiceDeficitRecord,
  ctx: DataConfidenceContext,
  globalCarrierSupply: LayerSignals,
): TranspoDataConfidenceRecord {
  const now = new Date().toISOString();
  const verification = detectVerificationStatusForMarket(
    ctx.carriers,
    ctx.verifications,
    deficit.state,
    deficit.county,
  );
  const demand = detectDemandStatus(deficit.demand);
  const payer = detectPayerStatus(ctx.payers, deficit.state, deficit.county);
  const revenue = detectRevenueStatus(
    demand.status,
    payer.status,
    globalCarrierSupply.status,
    verification.status,
    !!deficit.revenueOpportunity,
  );

  const layers = {
    carrierSupply: globalCarrierSupply.status,
    verification: verification.status,
    demand: demand.status,
    payer: payer.status,
    revenue: revenue.status,
  };

  const confidenceScore = confidenceScoreFromLayers(layers);
  const confidenceGrade = gradeFromScore(confidenceScore);

  const liveSignals = [
    ...globalCarrierSupply.liveSignals,
    ...verification.liveSignals,
    ...demand.liveSignals,
    ...payer.liveSignals,
    ...revenue.liveSignals,
  ];
  const seededSignals = [
    ...globalCarrierSupply.seededSignals,
    ...verification.seededSignals,
    ...demand.seededSignals,
    ...payer.seededSignals,
    ...revenue.seededSignals,
  ];
  const heuristicSignals = [
    ...globalCarrierSupply.heuristicSignals,
    ...verification.heuristicSignals,
    ...demand.heuristicSignals,
    ...payer.heuristicSignals,
    ...revenue.heuristicSignals,
  ];
  const missingSignals = [
    ...globalCarrierSupply.missingSignals,
    ...verification.missingSignals,
    ...demand.missingSignals,
    ...payer.missingSignals,
    ...revenue.missingSignals,
  ];
  const errors = [
    ...globalCarrierSupply.errors,
    ...verification.errors,
    ...demand.errors,
    ...payer.errors,
    ...revenue.errors,
  ];

  return {
    id: `confidence-${deficit.id}`,
    state: deficit.state,
    county: deficit.county,
    serviceCategory: deficit.serviceCategory,
    carrierSupplyStatus: globalCarrierSupply.status,
    verificationStatus: verification.status,
    demandStatus: demand.status,
    payerStatus: payer.status,
    revenueStatus: revenue.status,
    confidenceScore,
    confidenceGrade,
    liveSignals,
    seededSignals,
    heuristicSignals,
    missingSignals,
    errors,
    recommendedNextDataSource: recommendNextDataSource(layers),
    createdAt: now,
    updatedAt: now,
  };
}

export function buildTranspoDataConfidenceRecords(
  deficits: TranspoServiceDeficitRecord[],
  ctx: DataConfidenceContext,
): TranspoDataConfidenceRecord[] {
  const globalCarrierSupply = detectCarrierSupplyStatus(ctx.carriers, ctx.sourceRuns);
  return deficits.map((d) => buildConfidenceForDeficit(d, ctx, globalCarrierSupply));
}

export function toEmbeddedConfidence(
  record: TranspoDataConfidenceRecord,
): TranspoServiceDeficitDataConfidence {
  return {
    confidenceScore: record.confidenceScore,
    confidenceGrade: record.confidenceGrade,
    carrierSupplyStatus: record.carrierSupplyStatus,
    verificationStatus: record.verificationStatus,
    demandStatus: record.demandStatus,
    payerStatus: record.payerStatus,
    revenueStatus: record.revenueStatus,
    liveSignals: record.liveSignals,
    seededSignals: record.seededSignals,
    heuristicSignals: record.heuristicSignals,
    missingSignals: record.missingSignals,
    recommendedNextDataSource: record.recommendedNextDataSource,
  };
}

export function mergeConfidenceIntoDeficits(
  deficits: TranspoServiceDeficitRecord[],
  confidenceRecords: TranspoDataConfidenceRecord[],
): TranspoServiceDeficitRecord[] {
  const byKey = new Map(
    confidenceRecords.map((c) => [
      `${c.state}|${c.county ?? ""}|${c.serviceCategory ?? ""}`,
      c,
    ]),
  );

  return deficits.map((d) => {
    const key = `${d.state}|${d.county}|${d.serviceCategory}`;
    const conf = byKey.get(key);
    if (!conf) return d;
    return { ...d, dataConfidence: toEmbeddedConfidence(conf) };
  });
}

export async function buildLiveDataSetupStatus(
  ctx: DataConfidenceContext,
): Promise<TranspoLiveDataSetupStatus> {
  const { getTranspoBackendInfo } = await import("../db");
  const backend = await getTranspoBackendInfo();

  const demandLayer = ctx.demandRecords.length
    ? detectDemandStatus(ctx.demandRecords[0])
    : emptySignals();
  const payerLayer =
    ctx.payers.length > 0
      ? detectPayerStatus(ctx.payers, ctx.payers[0].state, ctx.payers[0].region)
      : emptySignals();

  return {
    databaseUrlPresent: backend.databaseUrlPresent,
    transpoFmcsaProvider: process.env.TRANSPO_FMCSA_PROVIDER ?? "mock (default)",
    googleMapsApiKeyPresent: !!(process.env.GOOGLE_MAPS_API_KEY ?? "").trim(),
    carrierMasterCount: ctx.carriers.length,
    verificationCount: ctx.verifications.length,
    demandSourceStatus: demandLayer.status,
    payerSourceStatus: payerLayer.status,
    storageBackend: backend.backend,
    storageDurable: backend.durable,
  };
}
