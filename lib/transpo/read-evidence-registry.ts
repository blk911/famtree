// lib/transpo/read-evidence-registry.ts

import { readFile } from "fs/promises";
import { COUNTY_EVIDENCE_DOSSIERS_ARTIFACT_PATH } from "./paths";
import type { CountyEvidenceDossiersArtifact } from "./evidence-types";

export async function readCountyEvidenceDossiersArtifact(
  path: string = COUNTY_EVIDENCE_DOSSIERS_ARTIFACT_PATH,
): Promise<CountyEvidenceDossiersArtifact | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as CountyEvidenceDossiersArtifact;
  } catch {
    return null;
  }
}
