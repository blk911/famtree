// lib/intelligence/transpo/demand/county-demand-engine.ts

import type { TranspoCarrierTarget } from "../types";
import { fetchCensusCountySeeds, resolveCountyFromCityState } from "./census-adapter";
import type { TranspoCountyDemandRecord } from "./demand-types";
import { computeDemandScore, estimateCountyDemographics } from "./demographic-engine";
import { inferCountyRurality } from "./rurality-engine";

export async function buildCountyDemandRecords(
  carriers: TranspoCarrierTarget[],
): Promise<TranspoCountyDemandRecord[]> {
  const seeds = await fetchCensusCountySeeds();
  const countyKeys = new Set(seeds.map((s) => s.countyFips));

  for (const carrier of carriers) {
    const state = (carrier.state ?? "").trim().toUpperCase();
    const city = (carrier.city ?? "").trim();
    if (!state) continue;
    const resolved = resolveCountyFromCityState(state, city);
    if (resolved && !countyKeys.has(resolved.countyFips)) {
      countyKeys.add(resolved.countyFips);
      seeds.push({
        countyFips: resolved.countyFips,
        state,
        county: resolved.county,
        population: 25000,
      });
    }
  }

  const records: TranspoCountyDemandRecord[] = [];
  for (const seed of seeds) {
    const rurality = inferCountyRurality(seed.countyFips, seed.state, seed.population);
    const demo = estimateCountyDemographics({ population: seed.population, rurality });
    records.push({
      countyFips: seed.countyFips,
      state: seed.state,
      county: seed.county,
      population: seed.population,
      seniors65Plus: demo.seniors65Plus,
      seniorsPercent: demo.seniorsPercent,
      veterans: demo.veterans,
      veteransPercent: demo.veteransPercent,
      medicaidPopulation: demo.medicaidPopulation,
      medicaidPercent: demo.medicaidPercent,
      rurality,
      healthcareAccessScore: demo.healthcareAccessScore,
      foodAccessScore: demo.foodAccessScore,
      demandScore: computeDemandScore(demo, rurality),
      sources: ["census_adapter_placeholder", "acs_demographic_heuristic"],
    });
  }

  records.sort((a, b) => b.demandScore - a.demandScore);
  return records;
}

export function findCountyDemand(
  records: TranspoCountyDemandRecord[],
  state: string,
  county: string,
): TranspoCountyDemandRecord | undefined {
  const st = state.trim().toUpperCase();
  const co = county.trim().toLowerCase();
  return records.find(
    (r) => r.state === st && r.county.toLowerCase() === co,
  );
}
