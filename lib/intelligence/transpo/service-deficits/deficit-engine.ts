// lib/intelligence/transpo/service-deficits/deficit-engine.ts
// Need + Payer - Coverage = Service Deficit (does not mutate carrier master).

import type { TranspoCoverageRecord } from "../coverage/coverage-types";
import type { TranspoCountyDemandRecord } from "../demand/demand-types";
import { SERVICE_CATEGORY_LABELS, type TranspoGapSeverity, type TranspoServiceCategory } from "../market-gaps/types";
import { getColoradoMarketPayerMeta, payerPresenceScoreForMarket } from "../payers/payer-engine";
import { toTranspoDataSourceStatus } from "../payers/colorado/colorado-registry-lookups";
import type { TranspoPayerRecord } from "../payers/payer-types";
import { buildRevenueOpportunity } from "./opportunity-value-engine";
import type { TranspoServiceDeficitRecord } from "./deficit-types";

export function deficitScoreFromComponents(
  needScore: number,
  payerPresenceScore: number,
  coverageScore: number,
): number {
  const raw = needScore + payerPresenceScore - coverageScore;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function severityFromDeficitScore(score: number): TranspoGapSeverity {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

function needScoreForCategory(
  demand: TranspoCountyDemandRecord,
  serviceCategory: TranspoServiceCategory,
): number {
  let score = demand.demandScore;
  if (serviceCategory === "nemt" || serviceCategory === "medical_transport") {
    score += Math.min(15, (demand.medicaidPercent ?? 0) * 0.5);
  }
  if (serviceCategory === "senior_transport" || serviceCategory === "meal_delivery") {
    score += Math.min(12, demand.seniorsPercent * 0.4);
  }
  if (serviceCategory === "veteran_transport") {
    score += Math.min(10, demand.veteransPercent * 0.6);
  }
  if (serviceCategory === "rural_transit" && (demand.rurality === "rural" || demand.rurality === "frontier")) {
    score += 10;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function buildTranspoServiceDeficitRecords(input: {
  demandRecords: TranspoCountyDemandRecord[];
  coverageRecords: TranspoCoverageRecord[];
  payers: TranspoPayerRecord[];
}): TranspoServiceDeficitRecord[] {
  const now = new Date().toISOString();
  const coverageByKey = new Map(
    input.coverageRecords.map((c) => [`${c.state}|${c.county}|${c.serviceCategory}`, c]),
  );

  const records: TranspoServiceDeficitRecord[] = [];

  for (const demand of input.demandRecords) {
    for (const serviceCategory of Object.keys(SERVICE_CATEGORY_LABELS) as TranspoServiceCategory[]) {
      const key = `${demand.state}|${demand.county}|${serviceCategory}`;
      const coverage = coverageByKey.get(key) ?? {
        state: demand.state,
        county: demand.county,
        countyFips: demand.countyFips,
        serviceCategory,
        providerCount: 0,
        verifiedProviderCount: 0,
        fleetCapacity: 0,
        driverCapacity: 0,
        coverageScore: 0,
        evidence: ["No classified providers in county for this service category."],
      };

      const needScore = needScoreForCategory(demand, serviceCategory);
      const payerPresenceScore = payerPresenceScoreForMarket(
        input.payers,
        demand.state,
        demand.county,
        serviceCategory,
      );
      const deficitScore = deficitScoreFromComponents(
        needScore,
        payerPresenceScore,
        coverage.coverageScore,
      );
      const severity = severityFromDeficitScore(deficitScore);

      const reasons: string[] = [];
      if (coverage.providerCount === 0) reasons.push("No classified providers for this service category.");
      if (coverage.verifiedProviderCount === 0 && coverage.providerCount > 0) {
        reasons.push("Providers present but verification is weak.");
      }
      if (payerPresenceScore > 0 && coverage.coverageScore < 30) {
        reasons.push("Payer/program presence exists with thin provider coverage.");
      }
      if (needScore >= 60) reasons.push("County need score indicates elevated demand.");
      if (demand.rurality === "rural" || demand.rurality === "frontier") {
        reasons.push(`${demand.rurality} county — access barriers elevate deficit.`);
      }

      const revenueOpportunity = buildRevenueOpportunity({
        serviceCategory,
        severity,
        deficitScore,
        demand,
        payerPresenceScore,
        providerCount: coverage.providerCount,
      });

      let approvedProviderCount: number | undefined;
      let brokerName: string | undefined;
      let payerEvidence: string[] | undefined;
      let payerStatus: ReturnType<typeof toTranspoDataSourceStatus> | undefined;

      if (demand.state === "CO") {
        const coMeta = getColoradoMarketPayerMeta(demand.county, serviceCategory);
        approvedProviderCount = coMeta.approvedProviderCount;
        brokerName = coMeta.brokerName;
        payerEvidence = coMeta.payerEvidence.length > 0 ? coMeta.payerEvidence : undefined;
        payerStatus = toTranspoDataSourceStatus(coMeta.payerStatus);
        if (coMeta.payerStatus === "live") {
          reasons.push("Colorado Medicaid/NEMT payer registry has evidence-backed broker reference.");
        } else if (coMeta.payerStatus === "seeded") {
          reasons.push("Colorado payer/broker data is seeded — pending live registry import.");
        }
        if (approvedProviderCount > 0) {
          reasons.push(`${approvedProviderCount} approved/visible provider(s) in Colorado registry.`);
        } else if (coMeta.payerStatus !== "missing") {
          reasons.push("No approved provider list for this county/service yet.");
        }
      }

      const id = `deficit-${demand.countyFips}-${serviceCategory}`.toLowerCase();

      const evidenceLines = [
        ...coverage.evidence,
        `Need score ${needScore} from county demand layer.`,
        `Payer presence score ${payerPresenceScore}.`,
        `Coverage score ${coverage.coverageScore}.`,
        `Carrier providers: ${coverage.providerCount}; verified: ${coverage.verifiedProviderCount}.`,
        ...(approvedProviderCount !== undefined
          ? [`Approved registry providers: ${approvedProviderCount}.`]
          : []),
        ...(brokerName ? [`Broker/payer: ${brokerName}.`] : []),
        ...(payerEvidence ?? []),
        "Demand demographics use census adapter placeholder until live ACS is connected.",
      ];

      records.push({
        id,
        state: demand.state,
        county: demand.county,
        countyFips: demand.countyFips,
        marketLabel: `${demand.county}, ${demand.state} — ${SERVICE_CATEGORY_LABELS[serviceCategory]}`,
        serviceCategory,
        needScore,
        payerPresenceScore,
        coverageScore: coverage.coverageScore,
        deficitScore,
        severity,
        demand,
        providerCount: coverage.providerCount,
        verifiedProviderCount: coverage.verifiedProviderCount,
        fleetCapacity: coverage.fleetCapacity,
        approvedProviderCount,
        brokerName,
        payerEvidence,
        payerStatus,
        reasons,
        evidence: evidenceLines,
        revenueOpportunity,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  records.sort((a, b) => b.deficitScore - a.deficitScore);
  return records;
}
