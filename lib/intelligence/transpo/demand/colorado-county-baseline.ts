// lib/intelligence/transpo/demand/colorado-county-baseline.ts
// All 64 Colorado counties — baseline seed for complete county × service deficit review.

import type { TranspoRurality } from "../market-gaps/types";

export const COLORADO_COUNTY_TOTAL = 64;

export const BASELINE_DEMAND_EVIDENCE =
  "Colorado county baseline seed pending live Census/ACS refresh.";

export type ColoradoCountyBaselineSeed = {
  county: string;
  countyFips: string;
  state: "CO";
  population?: number;
  seniors65Plus?: number;
  veterans?: number;
  rurality?: TranspoRurality;
  sourceStatus: "seeded" | "live" | "heuristic";
  sources: string[];
};

/** Known ACS-style populations from census adapter seeds (do not invent others). */
const KNOWN_POPULATION: Record<string, number> = {
  "08001": 522140,
  "08003": 16823,
  "08005": 655070,
  "08013": 326196,
  "08031": 715522,
  "08035": 357978,
  "08041": 730395,
  "08051": 17462,
  "08055": 6821,
  "08057": 1379,
  "08059": 582910,
  "08069": 360428,
};

const COUNTY_RURALITY_HINT: Record<string, TranspoRurality> = {
  "08031": "urban",
  "08005": "suburban",
  "08001": "suburban",
  "08035": "suburban",
  "08014": "suburban",
  "08041": "rural",
  "08069": "rural",
  "08013": "rural",
  "08051": "frontier",
  "08003": "rural",
  "08055": "rural",
  "08057": "frontier",
  "08053": "frontier",
  "08079": "frontier",
  "08095": "frontier",
  "08009": "frontier",
  "08017": "frontier",
  "08025": "frontier",
  "08027": "frontier",
  "08061": "frontier",
  "08063": "frontier",
  "08073": "frontier",
  "08075": "frontier",
  "08081": "frontier",
  "08089": "frontier",
  "08099": "frontier",
  "08109": "frontier",
  "08111": "frontier",
  "08115": "frontier",
  "08121": "frontier",
  "08125": "frontier",
};

/** All 64 Colorado counties (alphabetical by name). */
const COLORADO_COUNTIES: { county: string; countyFips: string }[] = [
  { county: "Adams", countyFips: "08001" },
  { county: "Alamosa", countyFips: "08003" },
  { county: "Arapahoe", countyFips: "08005" },
  { county: "Archuleta", countyFips: "08007" },
  { county: "Baca", countyFips: "08009" },
  { county: "Bent", countyFips: "08011" },
  { county: "Boulder", countyFips: "08013" },
  { county: "Broomfield", countyFips: "08014" },
  { county: "Chaffee", countyFips: "08015" },
  { county: "Cheyenne", countyFips: "08017" },
  { county: "Clear Creek", countyFips: "08019" },
  { county: "Conejos", countyFips: "08021" },
  { county: "Costilla", countyFips: "08023" },
  { county: "Crowley", countyFips: "08025" },
  { county: "Custer", countyFips: "08027" },
  { county: "Delta", countyFips: "08029" },
  { county: "Denver", countyFips: "08031" },
  { county: "Dolores", countyFips: "08033" },
  { county: "Douglas", countyFips: "08035" },
  { county: "Eagle", countyFips: "08037" },
  { county: "Elbert", countyFips: "08039" },
  { county: "El Paso", countyFips: "08041" },
  { county: "Fremont", countyFips: "08043" },
  { county: "Garfield", countyFips: "08045" },
  { county: "Gilpin", countyFips: "08047" },
  { county: "Grand", countyFips: "08049" },
  { county: "Gunnison", countyFips: "08051" },
  { county: "Hinsdale", countyFips: "08053" },
  { county: "Huerfano", countyFips: "08055" },
  { county: "Jackson", countyFips: "08057" },
  { county: "Jefferson", countyFips: "08059" },
  { county: "Kiowa", countyFips: "08061" },
  { county: "Kit Carson", countyFips: "08063" },
  { county: "Lake", countyFips: "08065" },
  { county: "La Plata", countyFips: "08067" },
  { county: "Larimer", countyFips: "08069" },
  { county: "Las Animas", countyFips: "08071" },
  { county: "Lincoln", countyFips: "08073" },
  { county: "Logan", countyFips: "08075" },
  { county: "Mesa", countyFips: "08077" },
  { county: "Mineral", countyFips: "08079" },
  { county: "Moffat", countyFips: "08081" },
  { county: "Montezuma", countyFips: "08083" },
  { county: "Montrose", countyFips: "08085" },
  { county: "Morgan", countyFips: "08087" },
  { county: "Otero", countyFips: "08089" },
  { county: "Ouray", countyFips: "08091" },
  { county: "Park", countyFips: "08093" },
  { county: "Phillips", countyFips: "08095" },
  { county: "Pitkin", countyFips: "08097" },
  { county: "Prowers", countyFips: "08099" },
  { county: "Pueblo", countyFips: "08101" },
  { county: "Rio Blanco", countyFips: "08103" },
  { county: "Rio Grande", countyFips: "08105" },
  { county: "Routt", countyFips: "08107" },
  { county: "Saguache", countyFips: "08109" },
  { county: "San Juan", countyFips: "08111" },
  { county: "San Miguel", countyFips: "08113" },
  { county: "Sedgwick", countyFips: "08115" },
  { county: "Summit", countyFips: "08117" },
  { county: "Teller", countyFips: "08119" },
  { county: "Washington", countyFips: "08121" },
  { county: "Weld", countyFips: "08123" },
  { county: "Yuma", countyFips: "08125" },
];

export function getAllColoradoCountyBaselineSeeds(): ColoradoCountyBaselineSeed[] {
  return COLORADO_COUNTIES.map(({ county, countyFips }) => {
    const population = KNOWN_POPULATION[countyFips];
    const rurality = COUNTY_RURALITY_HINT[countyFips];
    const hasKnownPop = population !== undefined;

    return {
      county,
      countyFips,
      state: "CO" as const,
      ...(population !== undefined ? { population } : {}),
      ...(rurality !== undefined ? { rurality } : {}),
      sourceStatus: hasKnownPop ? "seeded" as const : "heuristic" as const,
      sources: hasKnownPop
        ? ["colorado_county_baseline", "census_adapter_placeholder", BASELINE_DEMAND_EVIDENCE]
        : ["colorado_county_baseline", BASELINE_DEMAND_EVIDENCE],
    };
  });
}

export function coloradoBaselineCountyCount(): number {
  return COLORADO_COUNTIES.length;
}
