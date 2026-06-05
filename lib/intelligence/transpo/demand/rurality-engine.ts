// lib/intelligence/transpo/demand/rurality-engine.ts
// USDA RUCA placeholder — maps county FIPS to rurality band.

import type { TranspoRurality } from "../market-gaps/types";

/** Placeholder RUCA-style lookup (expand with USDA RUCA adapter). */
const COUNTY_RURALITY: Record<string, TranspoRurality> = {
  "08031": "urban",
  "08005": "suburban",
  "08001": "suburban",
  "08035": "suburban",
  "08041": "rural",
  "08069": "rural",
  "08051": "frontier",
  "08003": "rural",
  "08013": "rural",
};

const FRONTIER_STATES = new Set(["WY", "MT", "ND", "SD", "AK"]);

export function inferCountyRurality(countyFips: string, state: string, population: number): TranspoRurality {
  const mapped = COUNTY_RURALITY[countyFips];
  if (mapped) return mapped;
  const st = state.trim().toUpperCase();
  if (FRONTIER_STATES.has(st) && population < 15000) return "frontier";
  if (population >= 500000) return "urban";
  if (population >= 100000) return "suburban";
  if (population >= 25000) return "rural";
  return population < 10000 ? "frontier" : "rural";
}
