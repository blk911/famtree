/** Dev-only lock branch tracing for Today and related empty states. */

export type TodayLockBranchPayload = {
  file: string;
  component: string;
  hasCompletedFirstIngest?: boolean;
  wouldUnlockToday?: boolean;
  lockReason?: string | null;
  analysisId?: string | null;
  recordCount?: number;
  clientCount?: number;
  dataLoaded?: boolean;
  pageContext?: unknown;
  message?: string;
};

export function logTodayLockBranch(payload: TodayLockBranchPayload): void {
  if (process.env.NODE_ENV === "production") return;
  console.error("[TODAY-LOCK-BRANCH]", payload);
}

export function logTodayLockRendered(payload: Omit<TodayLockBranchPayload, "file" | "component">): void {
  if (process.env.NODE_ENV === "production") return;
  console.error("[TODAY-LOCK-RENDERED]", {
    file: "components/vmb/VmbTodayClient.tsx",
    component: "VmbTodayClient",
    ...payload,
  });
}
