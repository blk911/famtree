// lib/intelligence/transpo/demand/demographic-engine.ts

import type { TranspoRurality } from "../market-gaps/types";

export type DemographicInput = {
  population: number;
  rurality: TranspoRurality;
};

export type DemographicEstimates = {
  seniors65Plus: number;
  seniorsPercent: number;
  veterans: number;
  veteransPercent: number;
  medicaidPopulation?: number;
  medicaidPercent?: number;
  healthcareAccessScore?: number;
  foodAccessScore?: number;
};

/** ACS-style heuristic until Census API is wired. */
export function estimateCountyDemographics(input: DemographicInput): DemographicEstimates {
  const { population, rurality } = input;
  let seniorPct = 0.14;
  let veteranPct = 0.07;
  let medicaidPct = 0.12;

  if (rurality === "rural" || rurality === "frontier") {
    seniorPct = 0.19;
    veteranPct = 0.09;
    medicaidPct = 0.15;
    return {
      seniors65Plus: Math.round(population * seniorPct),
      seniorsPercent: Math.round(seniorPct * 1000) / 10,
      veterans: Math.round(population * veteranPct),
      veteransPercent: Math.round(veteranPct * 1000) / 10,
      medicaidPopulation: Math.round(population * medicaidPct),
      medicaidPercent: Math.round(medicaidPct * 1000) / 10,
      healthcareAccessScore: rurality === "frontier" ? 35 : 48,
      foodAccessScore: rurality === "frontier" ? 40 : 52,
    };
  }

  if (rurality === "urban") {
    seniorPct = 0.12;
    medicaidPct = 0.14;
  }

  return {
    seniors65Plus: Math.round(population * seniorPct),
    seniorsPercent: Math.round(seniorPct * 1000) / 10,
    veterans: Math.round(population * veteranPct),
    veteransPercent: Math.round(veteranPct * 1000) / 10,
    medicaidPopulation: Math.round(population * medicaidPct),
    medicaidPercent: Math.round(medicaidPct * 1000) / 10,
    healthcareAccessScore: rurality === "urban" ? 72 : 62,
    foodAccessScore: rurality === "urban" ? 78 : 65,
  };
}

/** Rurality-only demand score when Census demographics are unavailable. */
export function computeBaselineDemandScore(rurality: TranspoRurality): number {
  let score = 32;
  if (rurality === "urban") score += 8;
  if (rurality === "suburban") score += 5;
  if (rurality === "rural") score += 14;
  if (rurality === "frontier") score += 20;
  if (rurality === "unknown") score += 6;
  return Math.max(0, Math.min(100, score));
}

export function computeDemandScore(est: DemographicEstimates, rurality: TranspoRurality): number {
  let score = 40;
  score += Math.min(25, est.seniorsPercent * 1.2);
  score += Math.min(15, est.veteransPercent * 1.5);
  if (est.medicaidPercent) score += Math.min(15, est.medicaidPercent * 0.8);
  if (rurality === "rural") score += 12;
  if (rurality === "frontier") score += 18;
  if ((est.healthcareAccessScore ?? 100) < 50) score += 10;
  if ((est.foodAccessScore ?? 100) < 50) score += 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}
