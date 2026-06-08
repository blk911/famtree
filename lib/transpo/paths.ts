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
