// lib/intelligence/transpo/payers/colorado/colorado-nemt-provider-registry.ts
// Approved / visible Colorado transport providers — structured for live import later.

import type { ColoradoApprovedProviderRecord } from "./colorado-payer-types";

const SEEDED_EVIDENCE =
  "Seeded Colorado payer registry pending live source connection.";

const COLORADO_APPROVED_PROVIDERS: ColoradoApprovedProviderRecord[] = [
  {
    id: "co-provider-rtd",
    state: "CO",
    county: "Denver",
    city: "Denver",
    providerName: "Regional Transportation District (RTD)",
    serviceCategories: ["rural_transit", "senior_transport"],
    website: "https://www.rtd-denver.com",
    sourceUrl: "https://www.rtd-denver.com",
    evidence: ["Public regional transit district serving Denver Metro."],
    sourceStatus: "live",
  },
  {
    id: "co-provider-bustang",
    state: "CO",
    county: "Denver",
    providerName: "Colorado Bustang — CDOT Intercity Bus",
    serviceCategories: ["rural_transit"],
    website: "https://www.codot.gov/travel/bustang",
    sourceUrl: "https://www.codot.gov/travel/bustang",
    evidence: ["State-operated intercity/rural connector service."],
    sourceStatus: "live",
  },
  {
    id: "co-provider-nemt-placeholder",
    state: "CO",
    providerName: "Colorado Medicaid NEMT Approved Provider List",
    serviceCategories: ["nemt", "medical_transport"],
    evidence: [
      SEEDED_EVIDENCE,
      "Approved NEMT provider roster not yet imported — broker assignment only.",
    ],
    sourceStatus: "seeded",
  },
];

export function loadColoradoApprovedProviders(): ColoradoApprovedProviderRecord[] {
  return [...COLORADO_APPROVED_PROVIDERS];
}

function providerMatchesCounty(
  provider: ColoradoApprovedProviderRecord,
  county: string,
): boolean {
  if (!provider.county) return false;
  return provider.county.trim().toLowerCase() === county.trim().toLowerCase();
}

export function approvedProvidersForMarket(
  county: string,
  serviceCategory: string,
): ColoradoApprovedProviderRecord[] {
  return loadColoradoApprovedProviders().filter((p) => {
    if (!p.serviceCategories.includes(serviceCategory)) return false;
    if (!p.county) return false;
    return providerMatchesCounty(p, county);
  });
}

export function countApprovedProvidersForMarket(
  county: string,
  serviceCategory: string,
): number {
  return approvedProvidersForMarket(county, serviceCategory).length;
}
