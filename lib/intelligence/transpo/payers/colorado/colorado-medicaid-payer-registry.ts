// lib/intelligence/transpo/payers/colorado/colorado-medicaid-payer-registry.ts
// Colorado Medicaid / NEMT broker registry — adapter boundary for live import later.

import type { ColoradoNemtBrokerRecord } from "./colorado-payer-types";

const SEEDED_EVIDENCE =
  "Seeded Colorado payer registry pending live source connection.";

/** Evidence-backed brokers with official sourceUrl = live; others = seeded. */
const COLORADO_NEMT_BROKERS: ColoradoNemtBrokerRecord[] = [
  {
    id: "co-broker-hfc-nemt",
    state: "CO",
    region: "Statewide",
    brokerName: "Health First Colorado — Non-Emergency Medical Transportation",
    website: "https://www.healthfirstcolorado.com",
    serviceCategories: ["nemt", "medical_transport"],
    sourceUrl:
      "https://www.healthfirstcolorado.com/other-health-services/transportation-services",
    evidence: [
      "Official Health First Colorado page documents Medicaid-covered non-emergency transportation.",
    ],
    sourceStatus: "live",
  },
  {
    id: "co-broker-hcpf-nemt",
    state: "CO",
    region: "Statewide",
    brokerName: "Colorado HCPF — Non-Emergency Medical Transportation Program",
    website: "https://hcpf.colorado.gov",
    serviceCategories: ["nemt", "medical_transport"],
    sourceUrl: "https://hcpf.colorado.gov/non-emergency-medical-transportation",
    evidence: [
      "Colorado Department of Health Care Policy & Financing NEMT program reference.",
    ],
    sourceStatus: "live",
  },
  {
    id: "co-broker-drcog-aaa",
    state: "CO",
    region: "Denver Metro",
    county: "Denver",
    brokerName: "Denver Regional Council of Governments — Area Agency on Aging",
    serviceCategories: ["senior_transport", "meal_delivery"],
    evidence: [SEEDED_EVIDENCE, "Denver Metro AAA senior mobility reference — county broker TBD."],
    sourceStatus: "seeded",
  },
  {
    id: "co-broker-statewide-aaa-rural",
    state: "CO",
    region: "Rural CO",
    brokerName: "Colorado Area Agencies on Aging — Rural Senior Transport",
    serviceCategories: ["senior_transport", "meal_delivery"],
    evidence: [SEEDED_EVIDENCE, "Statewide AAA network — county-level broker mapping pending."],
    sourceStatus: "seeded",
  },
  {
    id: "co-broker-va-eastern-co",
    state: "CO",
    region: "Statewide",
    brokerName: "VA Eastern Colorado Health Care System — Veteran Transport Benefits",
    website: "https://www.va.gov/eastern-colorado-health-care",
    serviceCategories: ["veteran_transport", "medical_transport"],
    sourceUrl: "https://www.va.gov/eastern-colorado-health-care",
    evidence: ["VA Eastern Colorado public facility page — veteran medical access reference."],
    sourceStatus: "live",
  },
  {
    id: "co-broker-cdot-rural",
    state: "CO",
    region: "Statewide",
    brokerName: "Colorado DOT — Bustang / Rural Transit Connectors",
    website: "https://www.codot.gov",
    serviceCategories: ["rural_transit"],
    sourceUrl: "https://www.codot.gov/travel/bustang",
    evidence: ["CDOT Bustang public rural/intercity transit program reference."],
    sourceStatus: "live",
  },
  {
    id: "co-broker-meals-statewide",
    state: "CO",
    region: "Statewide",
    brokerName: "Colorado Meals on Wheels Network",
    serviceCategories: ["meal_delivery"],
    evidence: [SEEDED_EVIDENCE, "Statewide meal program broker — approved vendor list pending."],
    sourceStatus: "seeded",
  },
];

export function loadColoradoNemtBrokers(): ColoradoNemtBrokerRecord[] {
  return [...COLORADO_NEMT_BROKERS];
}

export function brokerMatchesCounty(
  broker: ColoradoNemtBrokerRecord,
  county: string,
): boolean {
  const co = county.trim().toLowerCase();
  if (broker.county && broker.county.toLowerCase() === co) return true;
  const region = (broker.region ?? "").toLowerCase();
  if (region === "statewide") return true;
  if (region === "rural co") return true;
  if (region === "denver metro" && ["denver", "arapahoe", "adams", "jefferson", "douglas", "broomfield"].includes(co)) {
    return true;
  }
  if (broker.region && broker.region.toLowerCase() === co) return true;
  return false;
}

export function brokersForMarket(
  county: string,
  serviceCategory: string,
): ColoradoNemtBrokerRecord[] {
  return loadColoradoNemtBrokers().filter(
    (b) =>
      brokerMatchesCounty(b, county) &&
      b.serviceCategories.includes(serviceCategory),
  );
}
