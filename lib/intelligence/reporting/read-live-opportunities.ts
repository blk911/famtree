// lib/intelligence/reporting/read-live-opportunities.ts

import { readFile } from "fs/promises";
import type { LiveOpportunityTargetsArtifact } from "./live-opportunity-types";
import { LIVE_OPPORTUNITY_TARGETS_ARTIFACT_PATH } from "./paths";

export async function readLiveOpportunityTargetsArtifact(): Promise<LiveOpportunityTargetsArtifact | null> {
  try {
    const raw = await readFile(LIVE_OPPORTUNITY_TARGETS_ARTIFACT_PATH, "utf8");
    return JSON.parse(raw) as LiveOpportunityTargetsArtifact;
  } catch {
    return null;
  }
}
