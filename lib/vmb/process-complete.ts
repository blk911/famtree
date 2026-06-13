import type { ActiveBookPointer } from "@/lib/vmb/active-book-pointer";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { VmbSalonWorkspace } from "@/types/vmb/workspace";

/** Original VMB handoff — not CODA, AIOS, or pointer alone. */
export function isVmbProcessComplete(input: {
  workspace?: VmbSalonWorkspace;
  activeAnalysis?: VmbBookAnalysisResult;
  activeAnalysisId?: string;
  activeBookPointer?: ActiveBookPointer;
  trialId?: string;
}): boolean {
  if (input.workspace?.firstIngestCompleted) return true;
  if (input.workspace?.latestAnalysisId?.trim()) return true;
  if (input.activeBookPointer?.analysisId?.trim()) return true;
  if (input.activeAnalysis?.analysisId && (input.activeAnalysis.recordCount ?? 0) > 0) {
    return true;
  }
  const analysisId = input.activeAnalysisId?.trim();
  if (analysisId && input.workspace?.analysisIds?.includes(analysisId)) return true;
  return false;
}
