import type { ResolvedActiveBook } from "@/lib/vmb/active-book-resolver";
import type { VmbSalonWorkspace } from "@/types/vmb/workspace";

export type BookIngestRequestIntent = {
  /** Explicit reprocess / replace from refresh flow or owner action. */
  reprocess?: boolean;
  refreshMode?: boolean;
  replaceBook?: boolean;
};

export type BookLoadedState = {
  workspace?: VmbSalonWorkspace | null;
  activeBook: Pick<ResolvedActiveBook, "hasActiveBook" | "analysisId" | "updatedAt">;
};

/** True when salon already has a loaded book and ingest should not run again implicitly. */
export function isBookAlreadyLoaded(state: BookLoadedState): boolean {
  if (!state.activeBook.hasActiveBook || !state.activeBook.analysisId) return false;
  if (state.workspace?.firstIngestCompleted) return true;
  if (state.workspace?.latestAnalysisId) return true;
  return true;
}

/** Book ingest runs only when no loaded book exists, or the caller explicitly requests reprocess. */
export function shouldRunBookIngest(
  state: BookLoadedState,
  intent: BookIngestRequestIntent = {},
): boolean {
  if (intent.reprocess || intent.refreshMode || intent.replaceBook) return true;
  return !isBookAlreadyLoaded(state);
}

export function formatBookLoadedAt(updatedAt?: string): string {
  if (!updatedAt) return "Recently";
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return updatedAt;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
