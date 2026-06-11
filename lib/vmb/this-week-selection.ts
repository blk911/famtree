import type { ClientOpportunityRow } from "@/lib/vmb/client-opportunities";
import { getTopNetworkCandidates } from "@/lib/vmb/invite-drafts/build-invite-drafts";
import { buildWeeklyRevenueSummary } from "@/lib/vmb/operating-system/weekly-revenue";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

export type ThisWeekSelection = {
  rowIds: Set<string>;
  clientNames: Set<string>;
};

export function buildThisWeekSelection(analysis: VmbBookAnalysisResult): ThisWeekSelection {
  const weekly = buildWeeklyRevenueSummary(analysis);
  const rowIds = new Set(weekly.opportunities.map((o) => o.id));
  const clientNames = new Set(
    getTopNetworkCandidates(analysis, 10).map((c) => c.clientName.trim().toLowerCase()),
  );
  return { rowIds, clientNames };
}

export function isThisWeekRow(row: ClientOpportunityRow, selection: ThisWeekSelection): boolean {
  if (selection.rowIds.has(row.id)) return true;
  return selection.clientNames.has(row.clientName.trim().toLowerCase());
}
