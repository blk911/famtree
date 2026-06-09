// lib/transpo/read-transpo-opportunities.ts

import { readFile } from "fs/promises";
import type { TranspoOpportunitiesArtifact } from "./opportunity-types";
import { TRANSPO_OPPORTUNITIES_ARTIFACT_PATH } from "./paths";

export async function readTranspoOpportunitiesArtifact(): Promise<TranspoOpportunitiesArtifact | null> {
  try {
    const raw = await readFile(TRANSPO_OPPORTUNITIES_ARTIFACT_PATH, "utf8");
    return JSON.parse(raw) as TranspoOpportunitiesArtifact;
  } catch {
    return null;
  }
}
