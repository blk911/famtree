// lib/intelligence/transpo/demand/demand-types.ts

import type { TranspoRurality } from "../market-gaps/types";

export type TranspoDemandSourceStatus = "seeded" | "live" | "heuristic";

export type TranspoCountyDemandRecord = {
  countyFips: string;
  state: string;
  county: string;
  population?: number;
  seniors65Plus?: number;
  seniorsPercent?: number;
  veterans?: number;
  veteransPercent?: number;
  medicaidPopulation?: number;
  medicaidPercent?: number;
  rurality: TranspoRurality;
  healthcareAccessScore?: number;
  foodAccessScore?: number;
  demandScore: number;
  sources: string[];
  /** True when demographics are incomplete (baseline county without ACS data). */
  demandIncomplete?: boolean;
  sourceStatus?: TranspoDemandSourceStatus;
  baselineGenerated?: boolean;
};

export type TranspoDemandBuildMode = "observed" | "colorado_baseline";
