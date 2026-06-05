// lib/intelligence/transpo/network-formation/network-formation-summary.ts

import { hasCollegeAnchor } from "./network-formation-engine";
import type { NetworkFormationQuestion } from "./network-formation-types";
import type { CountyOpportunityDossier } from "../opportunity-dossiers/county-opportunity-types";

export function buildNetworkFormationQuestions(
  dossiers: CountyOpportunityDossier[],
): NetworkFormationQuestion[] {
  const nextWeek = dossiers.filter((d) => d.timeHorizon === "next_week");
  const collegePlays = dossiers.filter((d) => hasCollegeAnchor(d.county, d.state));
  const networkFormation = dossiers.filter((d) => d.opportunityType === "network_formation");
  const discoveryFirst = dossiers.filter(
    (d) => d.opportunityType === "data_validation" || d.opportunityType === "network_formation",
  );

  const nextWeekList = nextWeek
    .slice(0, 8)
    .map((d) => `${d.county} (${d.serviceCategory}, ${d.opportunityType ?? "—"})`)
    .join("; ");

  const collegeList = collegePlays
    .filter((d) => d.actionabilityScore >= 50)
    .slice(0, 8)
    .map((d) => `${d.county} — ${d.firstMove ?? d.nearTermPlay ?? ""}`)
    .join("; ");

  const networkList = networkFormation
    .slice(0, 6)
    .map((d) => `${d.county}, ${d.state}`)
    .join("; ");

  const firstMoves = [...dossiers]
    .sort((a, b) => b.actionabilityScore - a.actionabilityScore)
    .slice(0, 5)
    .map((d) => `${d.county}: ${d.firstMove ?? "—"}`)
    .join("; ");

  return [
    {
      id: "NF1",
      question: "Which opportunities can start next week?",
      answer:
        nextWeek.length > 0
          ? `${nextWeek.length} with timeHorizon=next_week. Top: ${nextWeekList || "—"}.`
          : "None flagged next-week yet — promote high-actionability network formation plays.",
    },
    {
      id: "NF2",
      question: "Which counties have college/student-network potential?",
      answer:
        collegePlays.length > 0
          ? `${collegePlays.length} Colorado anchor counties mapped. Examples: ${collegeList || "—"}.`
          : "No seeded college anchors matched — generic community college targets apply.",
    },
    {
      id: "NF3",
      question: "Which opportunities are best suited for network formation instead of acquisition or launch?",
      answer:
        networkFormation.length > 0
          ? `${networkFormation.length} network_formation plays (actionability≥65, ≤2 providers, payer present). ${networkList || "—"}.`
          : "No network formation plays qualified — check payer presence and provider scarcity.",
    },
    {
      id: "NF4",
      question: "Which first moves should we make?",
      answer: firstMoves || "Run county opportunity backfill after service deficits.",
    },
    {
      id: "NF5",
      question: "Which opportunities need discovery calls before capital?",
      answer:
        discoveryFirst.length > 0
          ? `${discoveryFirst.length} flagged for discovery-first path (network formation or data validation). Start with 10 calls per next-week play.`
          : "Review data_validation and network_formation types in Opportunity Radar.",
    },
  ];
}

export function networkPlaysSummary(dossiers: CountyOpportunityDossier[]) {
  const nextWeek = dossiers.filter((d) => d.timeHorizon === "next_week");
  const college = dossiers.filter(
    (d) => hasCollegeAnchor(d.county, d.state) && (d.opportunityType === "network_formation" || d.opportunityType === "workforce_pipeline"),
  );
  const partnership = dossiers.filter((d) => d.opportunityType === "provider_partnership");
  const rural = dossiers.filter(
    (d) => d.opportunityType === "network_formation" && d.serviceCategory === "rural_transit",
  );
  return { nextWeek, college, partnership, rural, networkFormation: dossiers.filter((d) => d.opportunityType === "network_formation") };
}
