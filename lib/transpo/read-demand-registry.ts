// lib/transpo/read-demand-registry.ts

import { readFile } from "fs/promises";
import {
  COUNTY_DEMAND_DOSSIERS_ARTIFACT_PATH,
  DEMAND_GENERATORS_ARTIFACT_PATH,
} from "./paths";
import type { CountyDemandDossiersArtifact, DemandGeneratorsArtifact } from "./types";

export async function readDemandGeneratorsArtifact(
  path: string = DEMAND_GENERATORS_ARTIFACT_PATH,
): Promise<DemandGeneratorsArtifact | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as DemandGeneratorsArtifact;
  } catch {
    return null;
  }
}

export async function readCountyDemandDossiersArtifact(
  path: string = COUNTY_DEMAND_DOSSIERS_ARTIFACT_PATH,
): Promise<CountyDemandDossiersArtifact | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as CountyDemandDossiersArtifact;
  } catch {
    return null;
  }
}
