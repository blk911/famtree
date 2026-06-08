// lib/transpo/build-county-demand-dossiers.ts

import { mkdir, readFile, writeFile } from "fs/promises";
import { getColoradoCountyPopulation } from "./county-population";
import { makeCountyKey } from "./normalize-demand-generator";
import {
  COUNTY_DEMAND_DOSSIERS_ARTIFACT_PATH,
  DEMAND_GENERATORS_ARTIFACT_PATH,
  TRANSPO_DATA_DIR,
} from "./paths";
import type {
  CountyDemandDossier,
  CountyDemandDossiersArtifact,
  DemandGenerator,
  DemandGeneratorCategory,
  DemandGeneratorsArtifact,
} from "./types";

const DEMAND_SCORE_BY_CATEGORY: Partial<Record<DemandGeneratorCategory, number>> = {
  hospital: 25,
  dialysis: 25,
  va: 20,
  behavioral_health: 15,
  adult_day: 15,
  meal_program: 15,
  senior_center: 10,
  school_transition: 10,
  pharmacy: 5,
};

const RECURRING_SCORE_BY_CATEGORY: Partial<Record<DemandGeneratorCategory, number>> = {
  dialysis: 30,
  meal_program: 20,
  adult_day: 20,
  senior_center: 10,
  va: 10,
};

const RURAL_ANCHOR_SCORE_BY_CATEGORY: Partial<Record<DemandGeneratorCategory, number>> = {
  hospital: 20,
  dialysis: 30,
  meal_program: 20,
  senior_center: 10,
  va: 10,
};

const ANCHOR_PRIORITY: DemandGeneratorCategory[] = [
  "hospital",
  "dialysis",
  "va",
  "behavioral_health",
  "meal_program",
  "adult_day",
  "senior_center",
  "school_transition",
  "pharmacy",
  "other",
];

function capScore(score: number): number {
  return Math.min(100, score);
}

function scoreFromCategories(
  generators: DemandGenerator[],
  weights: Partial<Record<DemandGeneratorCategory, number>>,
): number {
  const seen = new Set<DemandGeneratorCategory>();
  let total = 0;
  for (const g of generators) {
    if (seen.has(g.category)) continue;
    const weight = weights[g.category];
    if (weight) {
      total += weight;
      seen.add(g.category);
    }
  }
  return capScore(total);
}

function buildCountsByCategory(generators: DemandGenerator[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const g of generators) {
    counts[g.category] = (counts[g.category] ?? 0) + 1;
  }
  return counts;
}

function pickTopAnchors(generators: DemandGenerator[], limit = 5): DemandGenerator[] {
  return [...generators]
    .sort((a, b) => {
      const pa = ANCHOR_PRIORITY.indexOf(a.category);
      const pb = ANCHOR_PRIORITY.indexOf(b.category);
      if (pa !== pb) return pa - pb;
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return a.displayName.localeCompare(b.displayName);
    })
    .slice(0, limit);
}

function buildMissingData(
  county: string,
  state: string,
  generators: DemandGenerator[],
): string[] {
  const missing = new Set<string>();
  const categories = new Set(generators.map((g) => g.category));

  missing.add("provider_capacity_missing");
  missing.add("broker_recruitment_signal_missing");

  if (!getColoradoCountyPopulation(state, county)) {
    missing.add("county_population_missing");
  }

  const hospital = generators.find((g) => g.category === "hospital");
  if (hospital && hospital.annualDischarges == null) {
    missing.add("hospital_volume_missing");
  }

  const dialysis = generators.find((g) => g.category === "dialysis");
  if (dialysis && dialysis.stations == null) {
    missing.add("dialysis_station_count_missing");
  }

  const meals = generators.find((g) => g.category === "meal_program");
  if (meals && meals.estimatedTripsPerWeek == null) {
    missing.add("meals_volume_missing");
  }

  if (!categories.has("behavioral_health")) {
    missing.add("behavioral_health_facility_missing");
  }

  if (!categories.has("va")) {
    missing.add("va_clinic_missing");
  }

  return Array.from(missing).sort();
}

export function buildCountyDossiersFromGenerators(
  generators: DemandGenerator[],
  generatedAt = new Date().toISOString(),
): CountyDemandDossier[] {
  const grouped = new Map<string, DemandGenerator[]>();

  for (const g of generators) {
    const key = makeCountyKey(g.state, g.county);
    const list = grouped.get(key) ?? [];
    list.push(g);
    grouped.set(key, list);
  }

  const dossiers: CountyDemandDossier[] = [];

  for (const [countyKey, countyGenerators] of Array.from(grouped.entries())) {
    const [state, ...countyParts] = countyKey.split(":");
    const county = countyParts.join(":");

    const demandScore = scoreFromCategories(countyGenerators, DEMAND_SCORE_BY_CATEGORY);
    const recurringDemandScore = scoreFromCategories(countyGenerators, RECURRING_SCORE_BY_CATEGORY);
    const ruralAnchorScore = scoreFromCategories(countyGenerators, RURAL_ANCHOR_SCORE_BY_CATEGORY);

    dossiers.push({
      countyKey,
      county,
      state,
      generatedAt,
      demandGenerators: countyGenerators,
      countsByCategory: buildCountsByCategory(countyGenerators),
      demandScore,
      recurringDemandScore,
      ruralAnchorScore,
      topAnchors: pickTopAnchors(countyGenerators),
      missingData: buildMissingData(county, state, countyGenerators),
    });
  }

  return dossiers.sort((a, b) => {
    if (a.state !== b.state) return a.state.localeCompare(b.state);
    return a.county.localeCompare(b.county);
  });
}

export async function buildCountyDemandDossiers(
  registryPath: string = DEMAND_GENERATORS_ARTIFACT_PATH,
): Promise<CountyDemandDossiersArtifact> {
  const raw = await readFile(registryPath, "utf8");
  const registry = JSON.parse(raw) as DemandGeneratorsArtifact;
  const generatedAt = new Date().toISOString();
  const dossiers = buildCountyDossiersFromGenerators(registry.generators, generatedAt);

  const artifact: CountyDemandDossiersArtifact = {
    generatedAt,
    totalCounties: dossiers.length,
    dossiers,
  };

  await mkdir(TRANSPO_DATA_DIR, { recursive: true });
  await writeFile(
    COUNTY_DEMAND_DOSSIERS_ARTIFACT_PATH,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );

  return artifact;
}
