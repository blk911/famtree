// lib/intelligence/transpo/payers/colorado/colorado-registry-lookups.ts

import type { TranspoCountyDemandRecord } from "../../demand/demand-types";
import type { TranspoDataSourceStatus } from "../../data-confidence/data-confidence-types";
import type { TranspoPayerRecord } from "../payer-types";
import { brokersForMarket } from "./colorado-medicaid-payer-registry";
import {
  approvedProvidersForMarket,
  countApprovedProvidersForMarket,
} from "./colorado-nemt-provider-registry";
import type {
  ColoradoCountyCoverageSummary,
  ColoradoMarketPayerMeta,
  ColoradoRegistrySourceStatus,
} from "./colorado-payer-types";

export function resolveColoradoPayerStatus(
  brokers: ReturnType<typeof brokersForMarket>,
  approvedCount: number,
): ColoradoRegistrySourceStatus | "missing" {
  if (brokers.length === 0 && approvedCount === 0) return "missing";
  const hasLive = brokers.some((b) => b.sourceStatus === "live");
  if (hasLive) return "live";
  if (brokers.length > 0 || approvedCount > 0) return "seeded";
  return "missing";
}

export function toTranspoDataSourceStatus(
  status: ColoradoRegistrySourceStatus | "missing",
): TranspoDataSourceStatus {
  if (status === "live") return "live";
  if (status === "seeded") return "seeded";
  return "missing";
}

export function getColoradoMarketPayerMeta(
  county: string,
  serviceCategory: string,
): ColoradoMarketPayerMeta {
  const brokers = brokersForMarket(county, serviceCategory);
  const approved = approvedProvidersForMarket(county, serviceCategory);
  const approvedProviderCount = approved.filter((p) => p.county).length;
  const payerStatus = resolveColoradoPayerStatus(brokers, approvedProviderCount);

  const payerEvidence: string[] = [];
  for (const b of brokers) {
    payerEvidence.push(...b.evidence);
    if (b.sourceUrl) payerEvidence.push(`Broker source: ${b.sourceUrl}`);
  }
  for (const p of approved) {
    payerEvidence.push(...p.evidence);
    if (p.sourceUrl) payerEvidence.push(`Provider source: ${p.sourceUrl}`);
  }

  const primaryBroker = brokers.find((b) => b.sourceStatus === "live") ?? brokers[0];
  let payerPresenceBoost = 0;
  if (payerStatus === "live") payerPresenceBoost = 15;
  else if (payerStatus === "seeded") payerPresenceBoost = 8;
  if (approvedProviderCount > 0) payerPresenceBoost += Math.min(10, approvedProviderCount * 3);

  return {
    brokerName: primaryBroker?.brokerName,
    payerEvidence,
    payerStatus,
    approvedProviderCount,
    payerPresenceBoost,
  };
}

export function buildColoradoCountyCoverageSummary(
  demandRecords: TranspoCountyDemandRecord[],
): ColoradoCountyCoverageSummary {
  const coCounties = Array.from(
    new Set(
      demandRecords
        .filter((d) => d.state === "CO")
        .map((d) => d.county)
        .filter(Boolean),
    ),
  ).sort();

  const countiesWithPayerData: string[] = [];
  const countiesWithApprovedProviders: string[] = [];

  for (const county of coCounties) {
    const hasPayer = brokersForMarket(county, "nemt").length > 0 ||
      brokersForMarket(county, "medical_transport").length > 0 ||
      brokersForMarket(county, "senior_transport").length > 0 ||
      brokersForMarket(county, "meal_delivery").length > 0 ||
      brokersForMarket(county, "veteran_transport").length > 0 ||
      brokersForMarket(county, "rural_transit").length > 0;

    if (hasPayer) countiesWithPayerData.push(county);

    const hasApproved =
      countApprovedProvidersForMarket(county, "nemt") > 0 ||
      countApprovedProvidersForMarket(county, "medical_transport") > 0 ||
      countApprovedProvidersForMarket(county, "senior_transport") > 0 ||
      countApprovedProvidersForMarket(county, "rural_transit") > 0 ||
      countApprovedProvidersForMarket(county, "meal_delivery") > 0 ||
      countApprovedProvidersForMarket(county, "veteran_transport") > 0;

    if (hasApproved) countiesWithApprovedProviders.push(county);
  }

  const countiesMissingPayerData = coCounties.filter((c) => !countiesWithPayerData.includes(c));

  const scopeNote =
    coCounties.length === 0
      ? "No Colorado counties in current demand layer — run deficit backfill after carrier ingest."
      : `Evaluating ${coCounties.length} Colorado ${coCounties.length === 1 ? "county" : "counties"} present in demand/carrier-touched records — not all 64 Colorado counties.`;

  return {
    scopeNote,
    countiesRepresented: coCounties,
    countiesWithPayerData,
    countiesWithApprovedProviders,
    countiesMissingPayerData,
    totalInScope: coCounties.length,
    coloradoCountyTotal: 64,
  };
}

export function coloradoPayerRecordsFromRegistry(
  demandRecords: TranspoCountyDemandRecord[],
): TranspoPayerRecord[] {
  const coCounties = demandRecords.filter((d) => d.state === "CO");
  const payers: TranspoPayerRecord[] = [];
  const seen = new Set<string>();

  for (const demand of coCounties) {
    for (const broker of brokersForMarket(demand.county, "nemt")) {
      const key = broker.id;
      if (seen.has(key)) continue;
      seen.add(key);
      payers.push({
        payerId: broker.id,
        state: "CO",
        region: broker.county ?? broker.region ?? "Statewide",
        payerName: broker.brokerName,
        category: broker.serviceCategories.includes("nemt") ? "medicaid" : "area_agency_on_aging",
        serviceCategories: broker.serviceCategories,
        website: broker.website,
        sourceUrl: broker.sourceUrl,
        evidence: broker.evidence,
        sourceStatus: broker.sourceStatus,
        brokerName: broker.brokerName,
        notes: broker.sourceStatus === "seeded" ? "Seeded Colorado payer registry" : undefined,
      });
    }

    const categories = [
      "nemt",
      "medical_transport",
      "senior_transport",
      "veteran_transport",
      "meal_delivery",
      "rural_transit",
    ] as const;

    for (const cat of categories) {
      for (const broker of brokersForMarket(demand.county, cat)) {
        if (seen.has(broker.id)) continue;
        seen.add(broker.id);
        const category =
          cat === "nemt" || cat === "medical_transport"
            ? "medicaid"
            : cat === "veteran_transport"
              ? "veterans_affairs"
              : cat === "meal_delivery"
                ? "meal_program"
                : cat === "rural_transit"
                  ? "county_transit"
                  : "area_agency_on_aging";
        payers.push({
          payerId: broker.id,
          state: "CO",
          region: broker.county ?? broker.region ?? demand.county,
          payerName: broker.brokerName,
          category,
          serviceCategories: broker.serviceCategories,
          website: broker.website,
          sourceUrl: broker.sourceUrl,
          evidence: broker.evidence,
          sourceStatus: broker.sourceStatus,
          brokerName: broker.brokerName,
          notes: broker.sourceStatus === "seeded" ? "Seeded Colorado payer registry" : undefined,
        });
      }
    }
  }

  return payers;
}
