// lib/intelligence/reporting/read-reporting-registry.ts

import { readFile } from "fs/promises";
import type {
  AuditFindingsArtifact,
  KpiRegistryArtifact,
  OperationalStressSignalsArtifact,
  RequiredReportsArtifact,
} from "./reporting-types";
import {
  AUDIT_FINDINGS_ARTIFACT_PATH,
  KPI_REGISTRY_ARTIFACT_PATH,
  OPERATIONAL_STRESS_SIGNALS_ARTIFACT_PATH,
  REQUIRED_REPORTS_ARTIFACT_PATH,
} from "./paths";

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function readRequiredReportsArtifact(): Promise<RequiredReportsArtifact | null> {
  return readJson<RequiredReportsArtifact>(REQUIRED_REPORTS_ARTIFACT_PATH);
}

export async function readKpiRegistryArtifact(): Promise<KpiRegistryArtifact | null> {
  return readJson<KpiRegistryArtifact>(KPI_REGISTRY_ARTIFACT_PATH);
}

export async function readAuditFindingsArtifact(): Promise<AuditFindingsArtifact | null> {
  return readJson<AuditFindingsArtifact>(AUDIT_FINDINGS_ARTIFACT_PATH);
}

export async function readOperationalStressSignalsArtifact(): Promise<OperationalStressSignalsArtifact | null> {
  return readJson<OperationalStressSignalsArtifact>(OPERATIONAL_STRESS_SIGNALS_ARTIFACT_PATH);
}
