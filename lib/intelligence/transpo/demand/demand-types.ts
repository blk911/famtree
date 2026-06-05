// lib/intelligence/transpo/demand/demand-types.ts

import type { TranspoRurality } from "../market-gaps/types";

export type TranspoCountyDemandRecord = {
  countyFips: string;
  state: string;
  county: string;
  population: number;
  seniors65Plus: number;
  seniorsPercent: number;
  veterans: number;
  veteransPercent: number;
  medicaidPopulation?: number;
  medicaidPercent?: number;
  rurality: TranspoRurality;
  healthcareAccessScore?: number;
  foodAccessScore?: number;
  demandScore: number;
  sources: string[];
};
