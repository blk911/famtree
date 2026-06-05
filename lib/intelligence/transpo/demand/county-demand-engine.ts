// lib/intelligence/transpo/demand/county-demand-engine.ts

import type { TranspoCarrierTarget } from "../types";
import { getAllColoradoCountyBaselineSeeds } from "./colorado-county-baseline";
import { fetchCensusCountySeeds, resolveCountyFromCityState } from "./census-adapter";
import type { TranspoCountyDemandRecord, TranspoDemandBuildMode } from "./demand-types";
import {
  computeBaselineDemandScore,
  computeDemandScore,
  estimateCountyDemographics,
} from "./demographic-engine";
import { inferCountyRurality } from "./rurality-engine";

function seedToDemandRecord(
  seed: {
    countyFips: string;
    state: string;
    county: string;
    population?: number;
    rurality?: import("../market-gaps/types").TranspoRurality;
    sourceStatus?: "seeded" | "live" | "heuristic";
    sources: string[];
  },
  options?: { baselineGenerated?: boolean },
): TranspoCountyDemandRecord {
  const population = seed.population;
  const rurality =
    seed.rurality ??
    inferCountyRurality(seed.countyFips, seed.state, population ?? 0);

  if (population === undefined) {
    return {
      countyFips: seed.countyFips,
      state: seed.state,
      county: seed.county,
      rurality,
      demandScore: computeBaselineDemandScore(rurality),
      sources: seed.sources,
      demandIncomplete: true,
      sourceStatus: seed.sourceStatus ?? "heuristic",
      baselineGenerated: options?.baselineGenerated,
    };
  }

  const demo = estimateCountyDemographics({ population, rurality });
  return {
    countyFips: seed.countyFips,
    state: seed.state,
    county: seed.county,
    population,
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
    sources: seed.sources,
    sourceStatus: seed.sourceStatus ?? "seeded",
    baselineGenerated: options?.baselineGenerated,
  };
}

export async function buildCountyDemandRecords(
  carriers: TranspoCarrierTarget[],
  mode: TranspoDemandBuildMode = "colorado_baseline",
): Promise<TranspoCountyDemandRecord[]> {
  if (mode === "colorado_baseline") {
    const records = getAllColoradoCountyBaselineSeeds().map((seed) =>
      seedToDemandRecord(seed, { baselineGenerated: true }),
    );
    records.sort((a, b) => b.demandScore - a.demandScore);
    return records;
  }

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
    records.push(
      seedToDemandRecord({
        ...seed,
        sources: ["census_adapter_placeholder", "acs_demographic_heuristic"],
        sourceStatus: "seeded",
      }),
    );
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
