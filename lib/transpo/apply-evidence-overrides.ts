// lib/transpo/apply-evidence-overrides.ts

import type { EvidenceOverride } from "./evidence-override-types";
import type { CountyEvidenceDossier, EvidenceCategory, EvidenceItem } from "./evidence-types";

const EVIDENCE_KEY_META: Record<string, { label: string; category: EvidenceCategory }> = {
  vehicle_count: { label: "Vehicle count", category: "operations" },
  driver_count: { label: "Driver count", category: "operations" },
  wheelchair_vehicle_count: { label: "Wheelchair vehicle count", category: "capacity" },
  stretcher_vehicle_count: { label: "Stretcher vehicle count", category: "capacity" },
  monthly_trip_volume: { label: "Monthly trip volume", category: "operations" },
  completed_trip_count: { label: "Completed trip count", category: "operations" },
  denied_trip_count: { label: "Denied trip count", category: "operations" },
  cancelled_trip_count: { label: "Cancelled trip count", category: "operations" },
  missed_trip_count: { label: "Missed trip count", category: "operations" },
  hospital_discharge_delays: { label: "Hospital discharge delays", category: "demand" },
  broker_overflow_counts: { label: "Broker overflow counts", category: "broker" },
  provider_recruiting_activity: { label: "Provider recruiting activity", category: "capacity" },
  open_driver_positions: { label: "Open driver positions", category: "capacity" },
  complaint_volume: { label: "Complaint volume", category: "quality" },
  ride_satisfaction: { label: "Ride satisfaction", category: "quality" },
  average_wait_time: { label: "Average wait time", category: "quality" },
  hospital_exists: { label: "Hospital", category: "demand" },
  dialysis_exists: { label: "Dialysis", category: "demand" },
  va_clinic_exists: { label: "VA clinic", category: "demand" },
  meal_program_exists: { label: "Meal program", category: "demand" },
  senior_center_exists: { label: "Senior center", category: "demand" },
  provider_count: { label: "Credentialed providers", category: "capacity" },
  county_population: { label: "County population", category: "demand" },
  capacity_score: { label: "Capacity score", category: "capacity" },
  demand_score: { label: "Demand score", category: "demand" },
};

function findExistingItem(
  dossier: CountyEvidenceDossier,
  evidenceKey: string,
): EvidenceItem | undefined {
  return (
    dossier.known.find((i) => i.key === evidenceKey) ??
    dossier.inferred.find((i) => i.key === evidenceKey) ??
    dossier.missing.find((i) => i.key === evidenceKey)
  );
}

function removeByKey(items: EvidenceItem[], key: string): EvidenceItem[] {
  return items.filter((i) => i.key !== key);
}

function computeCompletenessScore(known: number, inferred: number, missing: number): number {
  const total = known + inferred + missing;
  if (total === 0) return 0;
  return Math.round((known / total) * 100);
}

function computeResearchPriority(
  knownCount: number,
  missingCount: number,
): CountyEvidenceDossier["researchPriority"] {
  if (missingCount > knownCount) return "high";
  if (knownCount > missingCount) return "low";
  return "medium";
}

export function applyEvidenceOverridesToDossier(
  dossier: CountyEvidenceDossier,
  overrides: EvidenceOverride[],
): CountyEvidenceDossier {
  const countyOverrides = overrides.filter((o) => o.countyKey === dossier.countyKey);
  if (countyOverrides.length === 0) return dossier;

  let known = [...dossier.known];
  let inferred = [...dossier.inferred];
  let missing = [...dossier.missing];

  for (const override of countyOverrides) {
    const existing = findExistingItem(dossier, override.evidenceKey);
    const meta = EVIDENCE_KEY_META[override.evidenceKey];

    known = removeByKey(known, override.evidenceKey);
    inferred = removeByKey(inferred, override.evidenceKey);
    missing = removeByKey(missing, override.evidenceKey);

    const item: EvidenceItem = {
      key: override.evidenceKey,
      label: existing?.label ?? meta?.label ?? override.evidenceKey,
      category: existing?.category ?? meta?.category ?? "operations",
      status: override.status,
      value: override.value,
      source: override.source ?? "evidence_override",
      sourceUrl: override.sourceUrl,
      notes: override.notes,
      isOverride: true,
    };

    if (override.status === "known") known.push(item);
    else if (override.status === "inferred") inferred.push(item);
    else missing.push(item);
  }

  const knownCount = known.length;
  const inferredCount = inferred.length;
  const missingCount = missing.length;

  return {
    ...dossier,
    known,
    inferred,
    missing,
    knownCount,
    inferredCount,
    missingCount,
    evidenceCompletenessScore: computeCompletenessScore(knownCount, inferredCount, missingCount),
    researchPriority: computeResearchPriority(knownCount, missingCount),
  };
}

export function countKnownOverrides(
  dossiers: CountyEvidenceDossier[],
  overrides: EvidenceOverride[],
): number {
  const overrideKeys = new Set(
    overrides.filter((o) => o.status === "known").map((o) => `${o.countyKey}:${o.evidenceKey}`),
  );
  let count = 0;
  for (const dossier of dossiers) {
    for (const item of dossier.known) {
      if (item.isOverride && overrideKeys.has(`${dossier.countyKey}:${item.key}`)) {
        count += 1;
      }
    }
  }
  return count;
}
