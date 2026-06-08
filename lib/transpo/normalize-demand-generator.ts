// lib/transpo/normalize-demand-generator.ts

import type {
  DemandGenerator,
  DemandGeneratorCategory,
  RawDemandGeneratorInput,
} from "./types";

const CATEGORY_ALIASES: Record<string, DemandGeneratorCategory> = {
  hospital: "hospital",
  hospitals: "hospital",
  dialysis: "dialysis",
  "dialysis center": "dialysis",
  va: "va",
  "va clinic": "va",
  behavioral_health: "behavioral_health",
  "behavioral health": "behavioral_health",
  adult_day: "adult_day",
  "adult day": "adult_day",
  senior_center: "senior_center",
  "senior center": "senior_center",
  meal_program: "meal_program",
  "meal program": "meal_program",
  "meals on wheels": "meal_program",
  school_transition: "school_transition",
  pharmacy: "pharmacy",
  other: "other",
};

export function normalizeCategory(input: string | undefined): DemandGeneratorCategory {
  const key = (input ?? "other").trim().toLowerCase();
  return CATEGORY_ALIASES[key] ?? "other";
}

function normalizeFacilityToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function makeGeneratorKey(record: {
  state: string;
  county: string;
  category: DemandGeneratorCategory;
  facilityName: string;
}): string {
  const state = record.state.trim().toUpperCase();
  const county = normalizeFacilityToken(record.county.replace(/\s+county$/i, ""));
  const category = record.category;
  const name = normalizeFacilityToken(record.facilityName);
  return `transpo:${state}:${county}:${category}:${name}`;
}

export function makeCountyKey(state: string, county: string): string {
  const st = state.trim().toUpperCase();
  const co = county.trim().replace(/\s+county$/i, "");
  return `${st}:${co}`;
}

function computeConfidence(raw: RawDemandGeneratorInput, category: DemandGeneratorCategory): number {
  let score = 0;

  if (raw.sourceProvider === "manual_seed" && raw.facilityName && raw.county && category) {
    score = 55;
  } else if (raw.sourceProvider) {
    score = 60;
  }

  if (raw.address?.trim()) score += 10;
  if (raw.phone?.trim()) score += 10;
  if (raw.website?.trim()) score += 10;

  return Math.min(score, raw.sourceProvider === "manual_seed" ? 85 : 95);
}

export function estimateTripsPerWeek(record: {
  category: DemandGeneratorCategory;
  stations?: number;
  annualDischarges?: number;
}): number | undefined {
  if (record.category === "dialysis" && typeof record.stations === "number" && record.stations > 0) {
    return Math.round(record.stations * 6);
  }
  if (record.category === "hospital" && typeof record.annualDischarges === "number" && record.annualDischarges > 0) {
    return Math.round(record.annualDischarges / 52);
  }
  return undefined;
}

export function normalizeDemandGenerator(raw: RawDemandGeneratorInput, now = new Date()): DemandGenerator {
  const category = normalizeCategory(raw.category);
  const facilityName = raw.facilityName.trim();
  const displayName = (raw.displayName ?? facilityName).trim();
  const state = raw.state.trim().toUpperCase();
  const county = raw.county.trim().replace(/\s+county$/i, "");
  const iso = now.toISOString();

  const base = {
    category,
    facilityName,
    displayName,
    county,
    state,
    city: raw.city?.trim() || undefined,
    address: raw.address?.trim() || undefined,
    zip: raw.zip?.trim() || undefined,
    phone: raw.phone?.trim() || undefined,
    website: raw.website?.trim() || undefined,
    beds: typeof raw.beds === "number" ? raw.beds : undefined,
    stations: typeof raw.stations === "number" ? raw.stations : undefined,
    annualDischarges: typeof raw.annualDischarges === "number" ? raw.annualDischarges : undefined,
    annualVisits: typeof raw.annualVisits === "number" ? raw.annualVisits : undefined,
    sourceProvider: raw.sourceProvider,
    sourceType: raw.sourceType,
    sourceUrl: raw.sourceUrl?.trim() || undefined,
    sourceUpdatedAt: raw.sourceUpdatedAt?.trim() || undefined,
    notes: raw.notes?.length ? [...raw.notes] : undefined,
  };

  const estimatedTripsPerWeek = estimateTripsPerWeek(base);

  return {
    generatorKey: makeGeneratorKey(base),
    ...base,
    estimatedTripsPerWeek,
    confidence: computeConfidence(raw, category),
    createdAt: iso,
    updatedAt: iso,
  };
}
