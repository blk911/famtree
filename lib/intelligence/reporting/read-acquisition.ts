// lib/intelligence/reporting/read-acquisition.ts

import { readFile } from "fs/promises";
import type {
  ExtractedFailureSignalsArtifact,
  ExtractedMetricsArtifact,
  RecordsRequestTargetsArtifact,
  ReportAcquisitionArtifact,
  ReportSourcesArtifact,
} from "./acquisition-types";
import {
  EXTRACTED_FAILURE_SIGNALS_ARTIFACT_PATH,
  EXTRACTED_METRICS_ARTIFACT_PATH,
  RECORDS_REQUEST_TARGETS_ARTIFACT_PATH,
  REPORT_ACQUISITION_ARTIFACT_PATH,
  REPORT_SOURCES_ARTIFACT_PATH,
} from "./paths";

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function readReportSourcesArtifact(): Promise<ReportSourcesArtifact | null> {
  return readJson<ReportSourcesArtifact>(REPORT_SOURCES_ARTIFACT_PATH);
}

export async function readReportAcquisitionArtifact(): Promise<ReportAcquisitionArtifact | null> {
  return readJson<ReportAcquisitionArtifact>(REPORT_ACQUISITION_ARTIFACT_PATH);
}

export async function readExtractedMetricsArtifact(): Promise<ExtractedMetricsArtifact | null> {
  return readJson<ExtractedMetricsArtifact>(EXTRACTED_METRICS_ARTIFACT_PATH);
}

export async function readExtractedFailureSignalsArtifact(): Promise<ExtractedFailureSignalsArtifact | null> {
  return readJson<ExtractedFailureSignalsArtifact>(EXTRACTED_FAILURE_SIGNALS_ARTIFACT_PATH);
}

export async function readRecordsRequestTargetsArtifact(): Promise<RecordsRequestTargetsArtifact | null> {
  return readJson<RecordsRequestTargetsArtifact>(RECORDS_REQUEST_TARGETS_ARTIFACT_PATH);
}
