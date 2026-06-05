// lib/intelligence/transpo/service-deficits/opportunity-value-engine.ts

import { SERVICE_CATEGORY_LABELS, type TranspoServiceCategory, type TranspoGapSeverity } from "../market-gaps/types";
import type { TranspoCountyDemandRecord } from "../demand/demand-types";
import type { TranspoRevenueOpportunity, TranspoRevenuePotential } from "./deficit-types";

export function buildRevenueOpportunity(input: {
  serviceCategory: TranspoServiceCategory;
  severity: TranspoGapSeverity;
  deficitScore: number;
  demand: TranspoCountyDemandRecord;
  payerPresenceScore: number;
  providerCount: number;
}): TranspoRevenueOpportunity {
  const { serviceCategory, severity, deficitScore, demand, payerPresenceScore, providerCount } = input;

  let affected = demand.seniors65Plus;
  if (serviceCategory === "veteran_transport") affected = demand.veterans;
  if (serviceCategory === "nemt" || serviceCategory === "medical_transport") {
    affected = demand.medicaidPopulation ?? Math.round(demand.population * 0.08);
  }
  if (serviceCategory === "meal_delivery") affected = Math.round(demand.seniors65Plus * 0.35);

  const estimatedServiceDemand = Math.round(
    affected * (deficitScore / 100) * (payerPresenceScore > 0 ? 1.15 : 1),
  );

  let opportunityScore = Math.round(deficitScore * 0.6 + payerPresenceScore * 0.25 + Math.min(15, demand.demandScore * 0.15));
  if (providerCount === 0) opportunityScore += 10;
  opportunityScore = Math.max(0, Math.min(100, opportunityScore));

  let revenuePotential: TranspoRevenuePotential = "low";
  if (opportunityScore >= 80 && payerPresenceScore >= 40) revenuePotential = "strategic";
  else if (opportunityScore >= 65) revenuePotential = "high";
  else if (opportunityScore >= 45) revenuePotential = "medium";

  const high = severity === "high" || severity === "critical";
  let recommendedPlay = "Monitor service deficit and validate payer contracts.";

  if (serviceCategory === "nemt" && high) {
    recommendedPlay = "Investigate approved Medicaid transportation provider.";
  } else if (serviceCategory === "meal_delivery" && high) {
    recommendedPlay = "Investigate approved meal vendor opportunity.";
  } else if (serviceCategory === "senior_transport") {
    recommendedPlay = "Investigate assisted-living mobility partnership.";
  } else if (serviceCategory === "veteran_transport") {
    recommendedPlay = "Investigate VA transportation partnership.";
  } else if (serviceCategory === "medical_transport" && high) {
    recommendedPlay = "Investigate medical transport broker / clinic routing partnership.";
  } else if (serviceCategory === "rural_transit" && high) {
    recommendedPlay = "Investigate rural transit district expansion.";
  } else if (providerCount === 0 && payerPresenceScore > 0) {
    recommendedPlay = `Payer programs present in ${demand.county} but no classified ${SERVICE_CATEGORY_LABELS[serviceCategory]} providers.`;
  }

  return {
    estimatedPopulationAffected: affected,
    estimatedServiceDemand,
    opportunityScore,
    revenuePotential,
    recommendedPlay,
  };
}
