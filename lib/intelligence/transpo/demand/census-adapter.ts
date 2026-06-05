// lib/intelligence/transpo/demand/census-adapter.ts
// US Census / ACS placeholder connector. Returns seeded county rows where live API
// is unavailable; structure matches future Census API integration.

export type CensusCountySeed = {
  countyFips: string;
  state: string;
  county: string;
  population: number;
};

/** Colorado county seeds (ACS-style placeholder). Expand via Census API. */
const CO_COUNTY_SEEDS: CensusCountySeed[] = [
  { countyFips: "08031", state: "CO", county: "Denver", population: 715522 },
  { countyFips: "08005", state: "CO", county: "Arapahoe", population: 655070 },
  { countyFips: "08001", state: "CO", county: "Adams", population: 522140 },
  { countyFips: "08035", state: "CO", county: "Douglas", population: 357978 },
  { countyFips: "08041", state: "CO", county: "El Paso", population: 730395 },
  { countyFips: "08069", state: "CO", county: "Larimer", population: 360428 },
  { countyFips: "08013", state: "CO", county: "Boulder", population: 326196 },
  { countyFips: "08059", state: "CO", county: "Jefferson", population: 582910 },
  { countyFips: "08003", state: "CO", county: "Alamosa", population: 16823 },
  { countyFips: "08051", state: "CO", county: "Gunnison", population: 17462 },
  { countyFips: "08055", state: "CO", county: "Huerfano", population: 6821 },
  { countyFips: "08057", state: "CO", county: "Jackson", population: 1379 },
];

const CITY_TO_COUNTY_CO: Record<string, { countyFips: string; county: string }> = {
  denver: { countyFips: "08031", county: "Denver" },
  aurora: { countyFips: "08005", county: "Arapahoe" },
  "colorado springs": { countyFips: "08041", county: "El Paso" },
  "fort collins": { countyFips: "08069", county: "Larimer" },
  boulder: { countyFips: "08013", county: "Boulder" },
  lakewood: { countyFips: "08059", county: "Jefferson" },
  pueblo: { countyFips: "08041", county: "El Paso" },
  greeley: { countyFips: "08069", county: "Larimer" },
  parker: { countyFips: "08035", county: "Douglas" },
  alamosa: { countyFips: "08003", county: "Alamosa" },
};

export function resolveCountyFromCityState(
  state: string,
  city: string,
): { countyFips: string; county: string } | null {
  const st = state.trim().toUpperCase();
  const cityKey = city.trim().toLowerCase();
  if (st === "CO" && CITY_TO_COUNTY_CO[cityKey]) return CITY_TO_COUNTY_CO[cityKey];
  return null;
}

export async function fetchCensusCountySeeds(states?: string[]): Promise<CensusCountySeed[]> {
  void states;
  // Placeholder: live Census ACS adapter would fetch here.
  return [...CO_COUNTY_SEEDS];
}
