// lib/transpo/county-population.ts
// Known county populations from existing project seeds (do not invent).

const KNOWN_POPULATION: Record<string, number> = {
  "CO:Adams": 522140,
  "CO:Alamosa": 16823,
  "CO:Arapahoe": 655070,
  "CO:Boulder": 326196,
  "CO:Denver": 715522,
  "CO:Douglas": 357978,
  "CO:El Paso": 730395,
  "CO:Gunnison": 17462,
  "CO:Huerfano": 6821,
  "CO:Jackson": 1379,
  "CO:Jefferson": 582910,
  "CO:Larimer": 360428,
};

export function getColoradoCountyPopulation(state: string, county: string): number | undefined {
  const st = state.trim().toUpperCase();
  const co = county.trim().replace(/\s+county$/i, "");
  return KNOWN_POPULATION[`${st}:${co}`];
}
