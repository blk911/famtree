// lib/intelligence/reporting/paths.ts

import path from "path";

export const REPORTING_DATA_DIR = path.join(process.cwd(), "runtime-data", "reporting");

export const REQUIRED_REPORTS_ARTIFACT_PATH = path.join(
  REPORTING_DATA_DIR,
  "required-reports.generated.json",
);

export const KPI_REGISTRY_ARTIFACT_PATH = path.join(
  REPORTING_DATA_DIR,
  "kpi-registry.generated.json",
);

export const AUDIT_FINDINGS_ARTIFACT_PATH = path.join(
  REPORTING_DATA_DIR,
  "audit-findings.generated.json",
);

export const OPERATIONAL_STRESS_SIGNALS_ARTIFACT_PATH = path.join(
  REPORTING_DATA_DIR,
  "operational-stress-signals.generated.json",
);

export const TRANSPO_DATA_OWNERSHIP_REGISTRY_PATH = path.join(
  process.cwd(),
  "runtime-data",
  "transpo",
  "data-ownership-registry.generated.json",
);

export const REPORT_SOURCES_ARTIFACT_PATH = path.join(
  REPORTING_DATA_DIR,
  "report-sources.generated.json",
);

export const REPORT_ACQUISITION_ARTIFACT_PATH = path.join(
  REPORTING_DATA_DIR,
  "report-acquisition.generated.json",
);

export const REPORT_ACQUISITION_STATE_PATH = path.join(
  REPORTING_DATA_DIR,
  "report-acquisition-state.json",
);

export const EXTRACTED_METRICS_ARTIFACT_PATH = path.join(
  REPORTING_DATA_DIR,
  "extracted-metrics.generated.json",
);

export const EXTRACTED_FAILURE_SIGNALS_ARTIFACT_PATH = path.join(
  REPORTING_DATA_DIR,
  "extracted-failure-signals.generated.json",
);

export const RECORDS_REQUEST_TARGETS_ARTIFACT_PATH = path.join(
  REPORTING_DATA_DIR,
  "records-request-targets.generated.json",
);

export const REPORTING_ACQUIRED_DIR = path.join(REPORTING_DATA_DIR, "acquired");
