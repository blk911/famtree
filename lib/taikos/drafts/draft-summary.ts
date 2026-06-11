import { isOpenDraftStatus } from "./draft-status";
import type { TaikosDraft, TaikosDraftSummary, TaikosDraftType } from "./types";

export function summarizeDrafts(drafts: TaikosDraft[], recentLimit = 6): TaikosDraftSummary {
  const open = drafts.filter((d) => isOpenDraftStatus(d.status));
  const draftsByType: Partial<Record<TaikosDraftType, number>> = {};

  for (const draft of open) {
    draftsByType[draft.draftType] = (draftsByType[draft.draftType] ?? 0) + 1;
  }

  const recentDrafts = [...drafts]
    .filter((d) => d.status !== "archived" && d.status !== "cancelled")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, recentLimit)
    .map((d) => ({
      draftId: d.draftId,
      title: d.title,
      draftType: d.draftType,
      status: d.status,
      createdAt: d.createdAt,
      estimatedValue: d.estimatedValue,
    }));

  return {
    totalDrafts: drafts.length,
    openDrafts: open.length,
    draftsByType,
    recentDrafts,
  };
}
