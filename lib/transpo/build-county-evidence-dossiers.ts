// lib/transpo/build-county-evidence-dossiers.ts

import { mkdir, readFile, writeFile } from "fs/promises";
import {
  applyEvidenceOverridesToDossier,
  countKnownOverrides,
} from "./apply-evidence-overrides";
import { getColoradoCountyPopulation } from "./county-population";
import { readEvidenceOverrides } from "./evidence-override-store";
import type {
  CountyEvidenceDossier,
  CountyEvidenceDossiersArtifact,
  EvidenceItem,
  ResearchPriority,
} from "./evidence-types";
import {
  COUNTY_CAPACITY_ARTIFACT_PATH,
  COUNTY_DEMAND_DOSSIERS_ARTIFACT_PATH,
  COUNTY_EVIDENCE_DOSSIERS_ARTIFACT_PATH,
  DEMAND_GENERATORS_ARTIFACT_PATH,
  TRANSPO_DATA_DIR,
} from "./paths";
import type { CountyCapacity, CountyCapacityArtifact } from "./provider-types";
import type {
  CountyDemandDossier,
  CountyDemandDossiersArtifact,
  DemandGenerator,
  DemandGeneratorsArtifact,
} from "./types";

const OPERATIONS_MISSING_ITEMS: Omit<EvidenceItem, "status">[] = [
  { key: "vehicle_count", label: "Vehicle count", category: "operations" },
  { key: "driver_count", label: "Driver count", category: "operations" },
  { key: "wheelchair_vehicle_count", label: "Wheelchair vehicle count", category: "capacity" },
  { key: "stretcher_vehicle_count", label: "Stretcher vehicle count", category: "capacity" },
  { key: "monthly_trip_volume", label: "Monthly trip volume", category: "operations" },
  { key: "completed_trip_count", label: "Completed trip count", category: "operations" },
  { key: "denied_trip_count", label: "Denied trip count", category: "operations" },
  { key: "cancelled_trip_count", label: "Cancelled trip count", category: "operations" },
  { key: "missed_trip_count", label: "Missed trip count", category: "operations" },
  { key: "hospital_discharge_delays", label: "Hospital discharge delays", category: "demand" },
  { key: "broker_overflow_counts", label: "Broker overflow counts", category: "broker" },
  { key: "provider_recruiting_activity", label: "Provider recruiting activity", category: "capacity" },
  { key: "open_driver_positions", label: "Open driver positions", category: "capacity" },
  { key: "complaint_volume", label: "Complaint volume", category: "quality" },
  { key: "ride_satisfaction", label: "Ride satisfaction", category: "quality" },
  { key: "average_wait_time", label: "Average wait time", category: "quality" },
];

function hasCategory(generators: DemandGenerator[], category: string): boolean {
  return generators.some((g) => g.category === category);
}

function buildOperationsMissing(): EvidenceItem[] {
  return OPERATIONS_MISSING_ITEMS.map((item) => ({ ...item, status: "missing" as const }));
}

function computeCompletenessScore(known: number, inferred: number, missing: number): number {
  const total = known + inferred + missing;
  if (total === 0) return 0;
  return Math.round((known / total) * 100);
}

function computeResearchPriority(knownCount: number, missingCount: number): ResearchPriority {
  if (missingCount > knownCount) return "high";
  if (knownCount > missingCount) return "low";
  return "medium";
}

function buildCountyEvidenceDossier(
  county: CountyCapacity,
  demandDossier: CountyDemandDossier | undefined,
  generatedAt: string,
): CountyEvidenceDossier {
  const generators = demandDossier?.demandGenerators ?? [];
  const known: EvidenceItem[] = [];
  const inferred: EvidenceItem[] = [];

  if (hasCategory(generators, "hospital")) {
    known.push({
      key: "hospital_exists",
      label: "Hospital",
      category: "demand",
      status: "known",
      source: generators.find((g) => g.category === "hospital")?.sourceProvider,
    });
  }

  if (hasCategory(generators, "dialysis")) {
    known.push({
      key: "dialysis_exists",
      label: "Dialysis",
      category: "demand",
      status: "known",
      source: generators.find((g) => g.category === "dialysis")?.sourceProvider,
    });
  }

  if (hasCategory(generators, "va")) {
    known.push({
      key: "va_clinic_exists",
      label: "VA clinic",
      category: "demand",
      status: "known",
      source: generators.find((g) => g.category === "va")?.sourceProvider,
    });
  }

  if (hasCategory(generators, "meal_program")) {
    known.push({
      key: "meal_program_exists",
      label: "Meal program",
      category: "demand",
      status: "known",
      source: generators.find((g) => g.category === "meal_program")?.sourceProvider,
    });
  }

  if (hasCategory(generators, "senior_center")) {
    known.push({
      key: "senior_center_exists",
      label: "Senior center",
      category: "demand",
      status: "known",
      source: generators.find((g) => g.category === "senior_center")?.sourceProvider,
    });
  }

  if (county.providerCount > 0) {
    known.push({
      key: "provider_count",
      label: "Credentialed providers",
      category: "capacity",
      status: "known",
      value: county.providerCount,
      source: "hcpf_nemt_registry",
    });
  }

  const population = getColoradoCountyPopulation(county.state, county.county);
  if (population != null) {
    known.push({
      key: "county_population",
      label: "County population",
      category: "demand",
      status: "known",
      value: population,
      source: "county_population_seed",
    });
  }

  if (county.capacityScore != null) {
    known.push({
      key: "capacity_score",
      label: "Capacity score",
      category: "capacity",
      status: "known",
      value: county.capacityScore,
      source: "hcpf_nemt_registry",
    });
  }

  if (demandDossier?.demandScore != null) {
    known.push({
      key: "demand_score",
      label: "Demand score",
      category: "demand",
      status: "known",
      value: demandDossier.demandScore,
      source: "demand_generator_registry",
    });
  }

  if (demandDossier && demandDossier.recurringDemandScore > 0) {
    inferred.push({
      key: "recurring_demand",
      label: "Recurring demand",
      category: "demand",
      status: "inferred",
      value: demandDossier.recurringDemandScore,
      notes: ["Derived from demand generator category weights"],
    });
  }

  if (demandDossier && demandDossier.demandScore > 0) {
    inferred.push({
      key: "transportation_need",
      label: "Transportation need",
      category: "demand",
      status: "inferred",
      value: demandDossier.demandScore,
      notes: ["Derived from documented demand anchors"],
    });
  }

  const hospital = generators.find((g) => g.category === "hospital");
  if (hospital && hospital.annualDischarges == null) {
    inferred.push({
      key: "potential_hospital_discharge_demand",
      label: "Potential hospital discharge demand",
      category: "demand",
      status: "inferred",
      notes: ["Hospital anchor exists without confirmed annual discharge volume"],
    });
  }

  const dialysis = generators.find((g) => g.category === "dialysis");
  if (dialysis && dialysis.stations == null) {
    inferred.push({
      key: "potential_dialysis_demand",
      label: "Potential dialysis demand",
      category: "demand",
      status: "inferred",
      notes: ["Dialysis anchor exists without confirmed station count"],
    });
  }

  const meal = generators.find((g) => g.category === "meal_program");
  if (meal && meal.estimatedTripsPerWeek == null) {
    inferred.push({
      key: "potential_meal_delivery_demand",
      label: "Potential meal delivery demand",
      category: "demand",
      status: "inferred",
      notes: ["Meal program anchor exists without confirmed trip volume"],
    });
  }

  if (demandDossier?.opportunityScore != null) {
    inferred.push({
      key: "opportunity_score",
      label: "Opportunity score",
      category: "demand",
      status: "inferred",
      value: demandDossier.opportunityScore,
      notes: ["Derived scoring model — not operational fact"],
    });
  }

  if (demandDossier?.gapLevel != null) {
    inferred.push({
      key: "gap_level",
      label: "Gap level",
      category: "demand",
      status: "inferred",
      value: demandDossier.gapLevel,
      notes: ["Derived from opportunity score thresholds"],
    });
  }

  if (demandDossier && demandDossier.ruralAnchorScore > 0) {
    inferred.push({
      key: "rural_anchor_score",
      label: "Rural anchor score",
      category: "demand",
      status: "inferred",
      value: demandDossier.ruralAnchorScore,
      notes: ["Derived from rural demand anchor weights"],
    });
  }

  const missing = buildOperationsMissing();
  const knownCount = known.length;
  const inferredCount = inferred.length;
  const missingCount = missing.length;

  return {
    countyKey: county.countyKey,
    county: county.county,
    state: county.state,
    known,
    inferred,
    missing,
    knownCount,
    inferredCount,
    missingCount,
    evidenceCompletenessScore: computeCompletenessScore(knownCount, inferredCount, missingCount),
    researchPriority: computeResearchPriority(knownCount, missingCount),
    generatedAt,
  };
}

async function loadJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function mergeEvidenceIntoDemandDossiers(
  evidenceDossiers: CountyEvidenceDossier[],
  demandArtifactPath: string = COUNTY_DEMAND_DOSSIERS_ARTIFACT_PATH,
): Promise<CountyDemandDossiersArtifact | null> {
  const demandArtifact = await loadJson<CountyDemandDossiersArtifact>(demandArtifactPath);
  if (!demandArtifact) return null;

  const evidenceByKey = new Map(evidenceDossiers.map((d) => [d.countyKey, d]));

  const dossiers = demandArtifact.dossiers.map((dossier) => {
    const evidence = evidenceByKey.get(dossier.countyKey);
    if (!evidence) return dossier;
    return {
      ...dossier,
      evidenceCompletenessScore: evidence.evidenceCompletenessScore,
      evidenceKnownCount: evidence.knownCount,
      evidenceInferredCount: evidence.inferredCount,
      evidenceMissingCount: evidence.missingCount,
      researchPriority: evidence.researchPriority,
    };
  });

  const updated: CountyDemandDossiersArtifact = {
    ...demandArtifact,
    generatedAt: new Date().toISOString(),
    dossiers,
  };

  await writeFile(demandArtifactPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  return updated;
}

export interface CountyEvidenceBuildResult {
  artifact: CountyEvidenceDossiersArtifact;
  overrideCount: number;
  knownOverriddenCount: number;
}

export async function buildCountyEvidenceDossiers(): Promise<CountyEvidenceBuildResult> {
  const countyCapacity = await loadJson<CountyCapacityArtifact>(COUNTY_CAPACITY_ARTIFACT_PATH);
  if (!countyCapacity) {
    throw new Error("County capacity artifact missing — run build:transpo:providers first");
  }

  const demandDossiersArtifact = await loadJson<CountyDemandDossiersArtifact>(
    COUNTY_DEMAND_DOSSIERS_ARTIFACT_PATH,
  );
  const demandByKey = new Map(
    (demandDossiersArtifact?.dossiers ?? []).map((d) => [d.countyKey, d]),
  );

  // Validate inputs exist (demand generators + provider capacity used upstream)
  await loadJson<DemandGeneratorsArtifact>(DEMAND_GENERATORS_ARTIFACT_PATH);

  const generatedAt = new Date().toISOString();
  const overrideStore = await readEvidenceOverrides();
  const overrides = overrideStore.overrides;

  let dossiers = countyCapacity.counties.map((county) =>
    buildCountyEvidenceDossier(county, demandByKey.get(county.countyKey), generatedAt),
  );

  dossiers = dossiers.map((d) => applyEvidenceOverridesToDossier(d, overrides));

  dossiers.sort((a, b) => {
    if (a.state !== b.state) return a.state.localeCompare(b.state);
    return a.county.localeCompare(b.county);
  });

  const artifact: CountyEvidenceDossiersArtifact = {
    generatedAt,
    totalCounties: dossiers.length,
    dossiers,
  };

  await mkdir(TRANSPO_DATA_DIR, { recursive: true });
  await writeFile(
    COUNTY_EVIDENCE_DOSSIERS_ARTIFACT_PATH,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );

  if (demandDossiersArtifact) {
    await mergeEvidenceIntoDemandDossiers(dossiers);
  }

  return {
    artifact,
    overrideCount: overrides.length,
    knownOverriddenCount: countKnownOverrides(dossiers, overrides),
  };
}
