// lib/transpo/paths.ts

import path from "path";

export const TRANSPO_DATA_DIR = path.join(process.cwd(), "runtime-data", "transpo");

export const DEMAND_GENERATORS_SEED_PATH = path.join(
  TRANSPO_DATA_DIR,
  "demand-generators.seed.json",
);

export const DEMAND_GENERATORS_ARTIFACT_PATH = path.join(
  TRANSPO_DATA_DIR,
  "demand-generators.generated.json",
);

export const COUNTY_DEMAND_DOSSIERS_ARTIFACT_PATH = path.join(
  TRANSPO_DATA_DIR,
  "county-demand-dossiers.generated.json",
);

export const PROVIDER_CAPACITY_SEED_PATH = path.join(
  TRANSPO_DATA_DIR,
  "provider-capacity.seed.json",
);

export const PROVIDER_CAPACITY_ARTIFACT_PATH = path.join(
  TRANSPO_DATA_DIR,
  "provider-capacity.generated.json",
);

export const COUNTY_CAPACITY_ARTIFACT_PATH = path.join(
  TRANSPO_DATA_DIR,
  "county-capacity.generated.json",
);

export const COUNTY_GAP_ANALYSIS_ARTIFACT_PATH = path.join(
  TRANSPO_DATA_DIR,
  "county-gap-analysis.generated.json",
);

export const COUNTY_EVIDENCE_DOSSIERS_ARTIFACT_PATH = path.join(
  TRANSPO_DATA_DIR,
  "county-evidence-dossiers.generated.json",
);

export const EVIDENCE_COLLECTION_QUEUE_ARTIFACT_PATH = path.join(
  TRANSPO_DATA_DIR,
  "evidence-collection-queue.generated.json",
);

export const COUNTY_RESEARCH_SUMMARY_ARTIFACT_PATH = path.join(
  TRANSPO_DATA_DIR,
  "county-research-summary.generated.json",
);

export const RESEARCH_TASK_STATE_PATH = path.join(
  TRANSPO_DATA_DIR,
  "research-task-state.json",
);

export const EVIDENCE_OVERRIDES_PATH = path.join(
  TRANSPO_DATA_DIR,
  "evidence-overrides.json",
);

export const TRANSPO_OPPORTUNITIES_ARTIFACT_PATH = path.join(
  TRANSPO_DATA_DIR,
  "transpo-opportunities.generated.json",
);
