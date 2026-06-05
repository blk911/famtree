// lib/intelligence/transpo/opportunity-dossiers/county-opportunity-summary.ts

import { hasCollegeAnchor } from "../network-formation/network-formation-engine";
import type { CountyOpportunityDossier, CountyOpportunitySummary } from "./county-opportunity-types";

export function buildCountyOpportunitySummary(
  dossiers: CountyOpportunityDossier[],
): CountyOpportunitySummary {
  const topImmediate = [...dossiers]
    .sort((a, b) => b.actionabilityScore - a.actionabilityScore)
    .filter((d) => d.actionabilityBand === "immediate" || d.actionabilityScore >= 75)
    .slice(0, 10);

  return {
    totalDossiers: dossiers.length,
    immediateOpportunities: dossiers.filter((d) => d.actionabilityBand === "immediate").length,
    priorityOpportunities: dossiers.filter((d) => d.actionabilityBand === "priority").length,
    zeroProviderRows: dossiers.filter((d) => d.providerCount === 0).length,
    topImmediate: topImmediate.length > 0 ? topImmediate : [...dossiers].sort((a, b) => b.actionabilityScore - a.actionabilityScore).slice(0, 10),
    nextWeekPlays: dossiers.filter((d) => d.timeHorizon === "next_week").length,
    networkFormationPlays: dossiers.filter((d) => d.opportunityType === "network_formation").length,
    collegeNetworkPlays: dossiers.filter(
      (d) =>
        hasCollegeAnchor(d.county, d.state) &&
        (d.opportunityType === "network_formation" || d.opportunityType === "workforce_pipeline"),
    ).length,
  };
}
