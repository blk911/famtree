// lib/intelligence/transpo/coverage/coverage-types.ts

import type { TranspoServiceCategory } from "../market-gaps/types";

export type TranspoCoverageRecord = {
  state: string;
  county: string;
  countyFips?: string;
  serviceCategory: TranspoServiceCategory;
  providerCount: number;
  verifiedProviderCount: number;
  fleetCapacity: number;
  driverCapacity: number;
  coverageScore: number;
  evidence: string[];
};
