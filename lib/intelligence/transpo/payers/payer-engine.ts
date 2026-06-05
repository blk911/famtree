// lib/intelligence/transpo/payers/payer-engine.ts
// Public payer / program registry (seeded v1; adapter-ready for state Medicaid regions).

import type { TranspoCountyDemandRecord } from "../demand/demand-types";
import type { TranspoPayerRecord } from "./payer-types";

const SEED_PAYERS: Omit<TranspoPayerRecord, "payerId">[] = [
  {
    state: "CO",
    region: "Statewide",
    payerName: "Health First Colorado (Medicaid)",
    category: "medicaid",
    serviceCategories: ["nemt", "medical_transport"],
    website: "https://www.healthfirstcolorado.com",
    notes: "NEMT broker network — placeholder seed",
  },
  {
    state: "CO",
    region: "Denver Metro",
    payerName: "Denver Regional Council of Governments AAA",
    category: "area_agency_on_aging",
    serviceCategories: ["senior_transport", "meal_delivery"],
    notes: "Area Agency on Aging placeholder",
  },
  {
    state: "CO",
    region: "Statewide",
    payerName: "VA Eastern Colorado Health Care System",
    category: "veterans_affairs",
    serviceCategories: ["veteran_transport", "medical_transport"],
    notes: "VA transportation benefits placeholder",
  },
  {
    state: "CO",
    region: "Statewide",
    payerName: "Colorado Meals on Wheels Network",
    category: "meal_program",
    serviceCategories: ["meal_delivery"],
    notes: "Senior meal program placeholder",
  },
  {
    state: "CO",
    region: "Rural CO",
    payerName: "Colorado Department of Transportation — Bustang / rural connectors",
    category: "county_transit",
    serviceCategories: ["rural_transit"],
    notes: "Public transit district placeholder",
  },
  {
    state: "CO",
    region: "Statewide",
    payerName: "Medicare Administrative Contractor (MAC)",
    category: "medicare",
    serviceCategories: ["medical_transport", "nemt"],
    notes: "Medicare transport coverage placeholder",
  },
];

export function buildTranspoPayerRecords(
  demandRecords: TranspoCountyDemandRecord[],
): TranspoPayerRecord[] {
  const states = new Set(demandRecords.map((d) => d.state));
  const payers: TranspoPayerRecord[] = [];

  for (const seed of SEED_PAYERS) {
    if (!states.has(seed.state) && states.size > 0) continue;
    payers.push({
      ...seed,
      payerId: `payer-${seed.state}-${seed.category}-${seed.region}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    });
  }

  for (const county of demandRecords) {
    if (county.rurality === "rural" || county.rurality === "frontier") {
      payers.push({
        payerId: `payer-${county.countyFips}-aaa`,
        state: county.state,
        region: county.county,
        payerName: `${county.county} County Area Agency on Aging`,
        category: "area_agency_on_aging",
        serviceCategories: ["senior_transport", "meal_delivery"],
        notes: "County AAA placeholder from demand layer",
      });
    }
  }

  return payers;
}

export function payerPresenceScoreForMarket(
  payers: TranspoPayerRecord[],
  state: string,
  county: string,
  serviceCategory: string,
): number {
  const st = state.trim().toUpperCase();
  const co = county.trim().toLowerCase();
  const matches = payers.filter((p) => {
    if (p.state !== st) return false;
    const regionMatch =
      p.region.toLowerCase() === "statewide" ||
      p.region.toLowerCase() === co ||
      p.region.toLowerCase().includes(co);
    const svc = p.serviceCategories.includes(serviceCategory);
    return regionMatch && svc;
  });
  if (matches.length === 0) return 0;
  if (matches.length >= 3) return 70;
  if (matches.length === 2) return 55;
  return 40;
}
