// lib/intelligence/reporting/report-acquisition-state.ts

import { mkdir, readFile, writeFile } from "fs/promises";
import type { AcquisitionStatus, ReportAcquisitionStateFile } from "./acquisition-types";
import { REPORT_ACQUISITION_STATE_PATH, REPORTING_DATA_DIR } from "./paths";

const DEFAULT_STATE: ReportAcquisitionStateFile = {
  version: 1,
  sources: {},
};

export async function readReportAcquisitionState(): Promise<ReportAcquisitionStateFile> {
  try {
    const raw = await readFile(REPORT_ACQUISITION_STATE_PATH, "utf8");
    return JSON.parse(raw) as ReportAcquisitionStateFile;
  } catch {
    return { ...DEFAULT_STATE, sources: { ...DEFAULT_STATE.sources } };
  }
}

export async function updateReportAcquisitionState(
  sourceKey: string,
  patch: { acquisitionStatus?: AcquisitionStatus; notes?: string },
): Promise<ReportAcquisitionStateFile> {
  const state = await readReportAcquisitionState();
  const existing = state.sources[sourceKey];
  state.sources[sourceKey] = {
    acquisitionStatus: patch.acquisitionStatus ?? existing?.acquisitionStatus ?? "discovered",
    updatedAt: new Date().toISOString(),
    notes: patch.notes ?? existing?.notes,
  };
  await mkdir(REPORTING_DATA_DIR, { recursive: true });
  await writeFile(REPORT_ACQUISITION_STATE_PATH, JSON.stringify(state, null, 2), "utf8");
  return state;
}

export function mergeSourceStatusWithState(
  sourceKey: string,
  defaultStatus: AcquisitionStatus,
  state: ReportAcquisitionStateFile,
): AcquisitionStatus {
  return state.sources[sourceKey]?.acquisitionStatus ?? defaultStatus;
}
