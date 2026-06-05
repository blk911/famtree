// lib/intelligence/transpo/network-formation/network-formation-engine.ts

import type { TranspoServiceCategory } from "../market-gaps/types";
import type { CountyOpportunityDossier } from "../opportunity-dossiers/county-opportunity-types";
import type {
  NetworkFormationFields,
  TranspoOpportunityType,
  TranspoTimeHorizon,
} from "./network-formation-types";

const NETWORK_FORMATION_SERVICES: TranspoServiceCategory[] = [
  "nemt",
  "senior_transport",
  "veteran_transport",
  "meal_delivery",
  "rural_transit",
];

type CountyAnchor = {
  college?: string;
  targets: string[];
};

const COLORADO_COUNTY_ANCHORS: Record<string, CountyAnchor> = {
  alamosa: {
    college: "Adams State University",
    targets: [
      "Adams State University",
      "San Luis Valley Health",
      "Alamosa County Human Services",
      "Senior center / aging services",
    ],
  },
  pueblo: {
    college: "CSU Pueblo",
    targets: [
      "CSU Pueblo",
      "Pueblo Community College",
      "Parkview / CommonSpirit hospital signals",
      "Pueblo senior services",
    ],
  },
  "la plata": {
    college: "Fort Lewis College",
    targets: [
      "Fort Lewis College",
      "Mercy Hospital",
      "La Plata County human services",
    ],
  },
  mesa: {
    college: "Colorado Mesa University",
    targets: [
      "Colorado Mesa University",
      "St. Mary's / Intermountain",
      "Mesa County human services",
    ],
  },
  weld: {
    college: "University of Northern Colorado",
    targets: [
      "University of Northern Colorado",
      "Aims Community College",
      "Weld County human services",
    ],
  },
};

const NEAR_TERM_PLAY_BY_SERVICE: Partial<Record<TranspoServiceCategory, string>> = {
  nemt: "Build a trusted local transport connector network around Medicaid ride demand.",
  senior_transport:
    "Build a senior mobility connector network through local students, churches, senior centers, and providers.",
  meal_delivery: "Build a meal delivery connector network around senior nutrition demand.",
  veteran_transport: "Build a veteran mobility connector network with VA/community partners.",
  rural_transit: "Build a rural mobility connector network with county, college, and provider partners.",
};

function normalizeCountyKey(county: string): string {
  return county.trim().toLowerCase().replace(/\s+county$/i, "");
}

function hasPayer(dossier: CountyOpportunityDossier): boolean {
  return (
    dossier.payerPresenceScore > 0 ||
    dossier.payers.length > 0 ||
    !!dossier.brokerName
  );
}

export function qualifiesForNetworkFormation(dossier: CountyOpportunityDossier): boolean {
  return (
    dossier.actionabilityScore >= 65 &&
    dossier.providerCount <= 2 &&
    hasPayer(dossier) &&
    NETWORK_FORMATION_SERVICES.includes(dossier.serviceCategory as TranspoServiceCategory)
  );
}

export function getCountyAnchor(county: string, state: string): CountyAnchor | null {
  if (state.toUpperCase() !== "CO") return null;
  return COLORADO_COUNTY_ANCHORS[normalizeCountyKey(county)] ?? null;
}

export function hasCollegeAnchor(county: string, state: string): boolean {
  return !!getCountyAnchor(county, state)?.college;
}

function genericTargets(dossier: CountyOpportunityDossier): string[] {
  const targets = [
    "Local community college",
    "County human services",
    "Senior center",
    "Hospital / clinic",
    "Workforce center",
  ];
  if (dossier.providers[0]?.companyName) {
    targets.push(`Existing provider: ${dossier.providers[0].companyName}`);
  } else {
    targets.push("Existing transport provider (if present)");
  }
  return targets;
}

export function resolveLocalNetworkTargets(dossier: CountyOpportunityDossier): string[] {
  const anchor = getCountyAnchor(dossier.county, dossier.state);
  const targets = anchor ? [...anchor.targets] : genericTargets(dossier);
  if (dossier.providers[0]?.companyName && !targets.some((t) => t.includes(dossier.providers[0].companyName))) {
    targets.push(`Existing provider: ${dossier.providers[0].companyName}`);
  }
  return targets;
}

function collegeNextWeekActions(dossier: CountyOpportunityDossier, college?: string): string[] {
  const collegeLabel = college ?? "local college or university";
  const providerLabel = dossier.providers[0]?.companyName ?? "existing provider if present";
  return [
    `Identify one faculty or student-life champion at ${collegeLabel}.`,
    "Recruit 5–10 motivated students as local mobility connectors.",
    `Call ${providerLabel} — ask what they need most: drivers, dispatch, rides, vehicles, scheduling, referrals.`,
    "Create a trusted local connector group (chat or weekly check-in).",
    "Map hospital, senior center, county human services, and veteran-service contacts.",
    "Run 10 discovery calls with mapped contacts.",
  ];
}

function communityNextWeekActions(dossier: CountyOpportunityDossier): string[] {
  const providerLabel = dossier.providers[0]?.companyName ?? "existing provider if present";
  return [
    "Find community college, workforce center, church, volunteer group, senior center, or county human-services contact.",
    "Recruit 3–5 local connectors willing to surface demand and referrals.",
    `Contact ${providerLabel}.`,
    "Validate whether the gap is driver, vehicle, dispatch, payer access, or demand visibility.",
    "Map payer/broker contacts and county agency entry points.",
    "Run 10 discovery calls.",
  ];
}

function buildFirstMove(
  dossier: CountyOpportunityDossier,
  type: TranspoOpportunityType,
  college?: string,
): string {
  const svc = dossier.serviceCategory as TranspoServiceCategory;
  if (type === "network_formation" && college) {
    const play =
      svc === "nemt"
        ? `Build a ${college} student connector network around NEMT demand in ${dossier.county}.`
        : `Find one ${college} faculty/student-life champion and recruit 5 motivated student connectors.`;
    return play;
  }
  if (type === "network_formation") {
    return `Find one trusted community connector in ${dossier.county} and recruit 3–5 local mobility advocates.`;
  }
  if (type === "workforce_pipeline" && college) {
    return `Recruit student mobility connectors at ${college} for ${dossier.county} ${svc} demand.`;
  }
  if (type === "provider_partnership" && dossier.providers[0]) {
    return `Open partnership conversation with ${dossier.providers[0].companyName} on capacity and referrals.`;
  }
  if (type === "data_validation") {
    return "Run payer and demand validation calls before capital commitment.";
  }
  if (type === "new_market_launch") {
    return `Validate launch prerequisites: payer access, dispatch, and first 10 rides in ${dossier.county}.`;
  }
  if (type === "provider_acquisition" && dossier.providers[0]) {
    return `Assess acquisition fit for ${dossier.providers[0].companyName} — fleet, authority, and county coverage.`;
  }
  return `Schedule first discovery call in ${dossier.county} within 7 days.`;
}

function determineOpportunityType(dossier: CountyOpportunityDossier): TranspoOpportunityType {
  if (qualifiesForNetworkFormation(dossier)) return "network_formation";

  if (dossier.confidenceScore < 35) return "data_validation";

  if (dossier.providerCount === 0 && dossier.actionabilityScore >= 70) return "new_market_launch";

  const college = hasCollegeAnchor(dossier.county, dossier.state);
  if (
    college &&
    dossier.providerCount <= 2 &&
    (dossier.serviceCategory === "nemt" || dossier.serviceCategory === "senior_transport")
  ) {
    return "workforce_pipeline";
  }

  if (dossier.providerCount >= 1 && dossier.providerCount <= 3 && hasPayer(dossier)) {
    return "provider_partnership";
  }

  if (dossier.providerCount >= 4 && dossier.providerCount <= 8) return "fleet_expansion";

  if (dossier.providerCount >= 1 && dossier.actionabilityScore >= 80) return "provider_acquisition";

  if (
    dossier.providers.some((p) => p.contactabilityScore < 40) &&
    dossier.providerCount >= 1
  ) {
    return "dispatch_support";
  }

  return "provider_partnership";
}

function resolveTimeHorizon(
  type: TranspoOpportunityType,
  dossier: CountyOpportunityDossier,
): TranspoTimeHorizon {
  if (type === "network_formation" && dossier.actionabilityScore >= 65) return "next_week";
  if (type === "workforce_pipeline") return "next_week";
  if (type === "data_validation") return "30_days";
  if (type === "new_market_launch" && dossier.actionabilityScore >= 75) return "30_days";
  if (dossier.actionabilityScore >= 75) return "30_days";
  if (dossier.actionabilityScore >= 50) return "90_days";
  return "strategic";
}

function expectedOutcomeFor(type: TranspoOpportunityType, county: string): string {
  switch (type) {
    case "network_formation":
      return "A trusted local mobility network that can uncover drivers, demand, provider needs, and partnership paths.";
    case "workforce_pipeline":
      return `A student/workforce connector pipeline in ${county} that surfaces rides, referrals, and operator needs.`;
    case "provider_partnership":
      return "A vetted partnership path with an existing operator to expand coverage without full acquisition.";
    case "fleet_expansion":
      return "Capacity expansion through fleet partners or subcontracted operators in the county.";
    case "provider_acquisition":
      return "Acquisition diligence package — authority, fleet, payer contracts, and county fit.";
    case "new_market_launch":
      return "Validated launch plan with payer access, dispatch workflow, and first rides scheduled.";
    case "dispatch_support":
      return "Dispatch/scheduling support that unblocks an existing provider's growth.";
    case "data_validation":
      return "Higher-confidence market read — validated payer, demand, and provider signals before capital.";
    default:
      return "Clear near-term execution path for the county opportunity.";
  }
}

export function suggestedDecisionForType(
  type: TranspoOpportunityType,
): "unreviewed" | "investigate" | "partner" | "acquire" | "launch" | "watch" | "reject" {
  switch (type) {
    case "network_formation":
      return "investigate";
    case "workforce_pipeline":
      return "partner";
    case "provider_partnership":
    case "fleet_expansion":
    case "dispatch_support":
      return "partner";
    case "provider_acquisition":
      return "acquire";
    case "new_market_launch":
      return "launch";
    case "data_validation":
      return "watch";
    default:
      return "investigate";
  }
}

export function buildNetworkFormationFields(
  dossier: CountyOpportunityDossier,
): NetworkFormationFields {
  const type = determineOpportunityType(dossier);
  const anchor = getCountyAnchor(dossier.county, dossier.state);
  const college = anchor?.college;
  const svc = dossier.serviceCategory as TranspoServiceCategory;
  const targets = resolveLocalNetworkTargets(dossier);
  const timeHorizon = resolveTimeHorizon(type, dossier);

  let nearTermPlay: string;
  if (type === "network_formation") {
    nearTermPlay = NEAR_TERM_PLAY_BY_SERVICE[svc] ?? NEAR_TERM_PLAY_BY_SERVICE.nemt!;
  } else if (type === "workforce_pipeline") {
    nearTermPlay = `Build a student/workforce connector pipeline around ${svc.replace(/_/g, " ")} demand in ${dossier.county}.`;
  } else if (type === "data_validation") {
    nearTermPlay = "Validate payer, demand, and provider signals before committing capital.";
  } else {
    nearTermPlay = dossier.recommendedPlay;
  }

  const nextWeekActions =
    type === "network_formation" || type === "workforce_pipeline"
      ? college
        ? collegeNextWeekActions(dossier, college)
        : communityNextWeekActions(dossier)
      : timeHorizon === "next_week"
        ? communityNextWeekActions(dossier).slice(0, 5)
        : undefined;

  return {
    opportunityType: type,
    nearTermPlay,
    firstMove: buildFirstMove(dossier, type, college),
    localNetworkTargets: targets,
    nextWeekActions,
    expectedOutcome: expectedOutcomeFor(type, dossier.county),
    timeHorizon,
  };
}

export function enrichCountyOpportunityDossier(
  dossier: CountyOpportunityDossier,
): CountyOpportunityDossier {
  const fields = buildNetworkFormationFields(dossier);
  return { ...dossier, ...fields };
}

export function enrichCountyOpportunityDossiers(
  dossiers: CountyOpportunityDossier[],
): CountyOpportunityDossier[] {
  return dossiers.map(enrichCountyOpportunityDossier);
}
