// lib/intelligence/reporting/read-targets.ts

import { readFile } from "fs/promises";
import type {
  ReportTargetsArtifact,
  RequestPackagesArtifact,
  RequestTemplatesArtifact,
} from "./target-types";
import {
  REPORT_TARGETS_ARTIFACT_PATH,
  REQUEST_PACKAGES_ARTIFACT_PATH,
  REQUEST_TEMPLATES_ARTIFACT_PATH,
} from "./paths";

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function readReportTargetsArtifact(): Promise<ReportTargetsArtifact | null> {
  return readJson<ReportTargetsArtifact>(REPORT_TARGETS_ARTIFACT_PATH);
}

export async function readRequestPackagesArtifact(): Promise<RequestPackagesArtifact | null> {
  return readJson<RequestPackagesArtifact>(REQUEST_PACKAGES_ARTIFACT_PATH);
}

export async function readRequestTemplatesArtifact(): Promise<RequestTemplatesArtifact | null> {
  return readJson<RequestTemplatesArtifact>(REQUEST_TEMPLATES_ARTIFACT_PATH);
}

export async function readTopAcquisitionTargets(limit = 5): Promise<ReportTargetsArtifact["targets"]> {
  const artifact = await readReportTargetsArtifact();
  if (!artifact) return [];
  return artifact.targets
    .filter((t) => t.status !== "acquired" && t.reportCategory !== "contract_attachment")
    .slice(0, limit);
}
