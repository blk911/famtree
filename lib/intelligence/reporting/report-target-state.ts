// lib/intelligence/reporting/report-target-state.ts

import { mkdir, readFile, writeFile } from "fs/promises";
import type { ReportTargetStateFile, ReportTargetStatus } from "./target-types";
import { REPORT_TARGET_STATE_PATH, REPORTING_DATA_DIR } from "./paths";

const DEFAULT_STATE: ReportTargetStateFile = {
  version: 1,
  targets: {},
};

export async function readReportTargetState(): Promise<ReportTargetStateFile> {
  try {
    const raw = await readFile(REPORT_TARGET_STATE_PATH, "utf8");
    return JSON.parse(raw) as ReportTargetStateFile;
  } catch {
    return { ...DEFAULT_STATE, targets: { ...DEFAULT_STATE.targets } };
  }
}

export async function updateReportTargetState(
  targetKey: string,
  patch: { status?: ReportTargetStatus; notes?: string },
): Promise<ReportTargetStateFile> {
  const state = await readReportTargetState();
  const existing = state.targets[targetKey];
  state.targets[targetKey] = {
    status: patch.status ?? existing?.status ?? "identified",
    updatedAt: new Date().toISOString(),
    notes: patch.notes ?? existing?.notes,
  };
  await mkdir(REPORTING_DATA_DIR, { recursive: true });
  await writeFile(REPORT_TARGET_STATE_PATH, JSON.stringify(state, null, 2), "utf8");
  return state;
}

export function mergeTargetStatusWithState(
  targetKey: string,
  defaultStatus: ReportTargetStatus,
  state: ReportTargetStateFile,
): ReportTargetStatus {
  return state.targets[targetKey]?.status ?? defaultStatus;
}
