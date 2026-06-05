// lib/intelligence/transpo/opportunity-dossiers/county-opportunity-engine.ts

import { SERVICE_CATEGORY_LABELS, type TranspoServiceCategory } from "../market-gaps/types";
import { getColoradoMarketPayerMeta } from "../payers/payer-engine";
import type { TranspoProviderDossier } from "../provider-dossiers/dossier-types";
import { dossiersForCounty } from "../provider-dossiers/dossier-engine";
import type { TranspoServiceDeficitRecord } from "../service-deficits/deficit-types";
import type { CountyOpportunityDossier } from "./county-opportunity-types";

export function providerScarcityScore(providerCount: number): number {
  if (providerCount <= 0) return 100;
  if (providerCount === 1) return 80;
  if (providerCount <= 3) return 60;
  if (providerCount <= 5) return 40;
  return 20;
}

export function actionabilityBand(
  score: number,
): CountyOpportunityDossier["actionabilityBand"] {
  if (score >= 75) return "immediate";
  if (score >= 50) return "priority";
  if (score >= 25) return "investigate";
  return "watch";
}

export function computeActionabilityScore(input: {
  deficitScore: number;
  confidenceScore: number;
  payerPresenceScore: number;
  providerCount: number;
}): number {
  const scarcity = providerScarcityScore(input.providerCount);
  const raw =
    input.deficitScore * 0.4 +
    input.confidenceScore * 0.25 +
    input.payerPresenceScore * 0.2 +
    scarcity * 0.15;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function buildCountyOpportunityDossier(
  deficit: TranspoServiceDeficitRecord,
  providerDossiers: TranspoProviderDossier[],
): CountyOpportunityDossier {
  const countyProviders = dossiersForCounty(providerDossiers, deficit.county, deficit.state);
  const confidenceScore = deficit.dataConfidence?.confidenceScore ?? 0;
  const actionabilityScore = computeActionabilityScore({
    deficitScore: deficit.deficitScore,
    confidenceScore,
    payerPresenceScore: deficit.payerPresenceScore,
    providerCount: deficit.providerCount,
  });

  const payers: CountyOpportunityDossier["payers"] = [];
  if (deficit.state === "CO") {
    const meta = getColoradoMarketPayerMeta(deficit.county, deficit.serviceCategory);
    if (meta.brokerName) {
      payers.push({
        name: meta.brokerName,
        category: deficit.serviceCategory,
        sourceStatus: meta.payerStatus,
      });
    }
  }

  const evidence = [
    ...deficit.evidence.slice(0, 8),
    ...(deficit.dataConfidence?.liveSignals ?? []).slice(0, 3).map((s) => `Live: ${s}`),
    `Actionability ${actionabilityScore} (${actionabilityBand(actionabilityScore)}).`,
  ];

  return {
    id: `opp-${deficit.county}-${deficit.state}-${deficit.serviceCategory}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
    county: deficit.county,
    state: deficit.state,
    serviceCategory: deficit.serviceCategory,
    population: deficit.demand.population,
    seniors: deficit.demand.seniors65Plus,
    veterans: deficit.demand.veterans,
    medicaidPopulation: deficit.demand.medicaidPopulation,
    rurality: deficit.demand.rurality,
    deficitScore: deficit.deficitScore,
    confidenceScore,
    payerPresenceScore: deficit.payerPresenceScore,
    providerCount: deficit.providerCount,
    providers: countyProviders.slice(0, 25).map((p) => ({
      providerId: p.providerId,
      companyName: p.companyName,
      phone: p.phone,
      website: p.website,
      contactabilityScore: p.contactabilityScore,
    })),
    payers,
    serviceCategories: [deficit.serviceCategory],
    recommendedPlay: deficit.revenueOpportunity.recommendedPlay,
    actionabilityScore,
    actionabilityBand: actionabilityBand(actionabilityScore),
    brokerName: deficit.brokerName,
    evidence,
  };
}

export function buildCountyOpportunityDossiers(
  deficits: TranspoServiceDeficitRecord[],
  providerDossiers: TranspoProviderDossier[],
): CountyOpportunityDossier[] {
  return deficits.map((d) => buildCountyOpportunityDossier(d, providerDossiers));
}

export function countyOpportunityLabel(d: CountyOpportunityDossier): string {
  return `${d.county}, ${d.state} — ${SERVICE_CATEGORY_LABELS[d.serviceCategory as TranspoServiceCategory] ?? d.serviceCategory}`;
}
