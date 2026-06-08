// lib/transpo/read-provider-registry.ts

import { readFile } from "fs/promises";
import {
  COUNTY_CAPACITY_ARTIFACT_PATH,
  COUNTY_GAP_ANALYSIS_ARTIFACT_PATH,
  PROVIDER_CAPACITY_ARTIFACT_PATH,
} from "./paths";
import type {
  CountyCapacityArtifact,
  CountyGapAnalysisArtifact,
  ProviderCapacityArtifact,
} from "./provider-types";

export async function readProviderCapacityArtifact(
  path: string = PROVIDER_CAPACITY_ARTIFACT_PATH,
): Promise<ProviderCapacityArtifact | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as ProviderCapacityArtifact;
  } catch {
    return null;
  }
}

export async function readCountyCapacityArtifact(
  path: string = COUNTY_CAPACITY_ARTIFACT_PATH,
): Promise<CountyCapacityArtifact | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as CountyCapacityArtifact;
  } catch {
    return null;
  }
}

export async function readCountyGapAnalysisArtifact(
  path: string = COUNTY_GAP_ANALYSIS_ARTIFACT_PATH,
): Promise<CountyGapAnalysisArtifact | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as CountyGapAnalysisArtifact;
  } catch {
    return null;
  }
}
