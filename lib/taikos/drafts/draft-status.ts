import type { TaikosDraftStatus } from "./types";

const OPEN_STATUSES = new Set<TaikosDraftStatus>([
  "draft",
  "reviewed",
  "approved",
  "ready_to_send",
]);

export function isOpenDraftStatus(status: TaikosDraftStatus): boolean {
  return OPEN_STATUSES.has(status);
}

export function draftStatusLabel(status: TaikosDraftStatus): string {
  const labels: Record<TaikosDraftStatus, string> = {
    draft: "Draft",
    reviewed: "Reviewed",
    approved: "Approved",
    ready_to_send: "Ready to send",
    sent: "Sent",
    archived: "Archived",
    cancelled: "Cancelled",
  };
  return labels[status];
}
