import { setActiveBookPointer } from "@/lib/vmb/active-book-pointer";
import { getVmbBookAnalysis } from "@/lib/vmb/book-analysis/analysis-store";
import { setLatestAnalysis, upsertWorkspaceForTrial } from "@/lib/vmb/workspace-store";

export type RestoreActiveBookResult =
  | { ok: true; analysisId: string; salonId: string }
  | { ok: false; error: string; status: 400 | 404 | 500 };

/**
 * Bind an existing analysis to the current salon session — pointer + workspace only.
 * Does not ingest, reprocess, or generate drafts.
 */
export async function restoreActiveBookForSalon(
  salonId: string,
  analysisId: string,
): Promise<RestoreActiveBookResult> {
  const trimmedSalon = salonId.trim();
  const trimmedAnalysis = analysisId.trim();
  if (!trimmedSalon || !trimmedAnalysis) {
    return { ok: false, error: "salonId and analysisId are required", status: 400 };
  }

  const analysis = await getVmbBookAnalysis(trimmedAnalysis);
  if (!analysis) {
    return { ok: false, error: "Analysis not found", status: 404 };
  }

  const workspaceResult = await upsertWorkspaceForTrial({
    trialId: trimmedSalon,
    salonName: analysis.salonName?.trim() || "Your Salon",
    providerPlatform: analysis.providerPlatform,
  });
  if ("error" in workspaceResult) {
    return { ok: false, error: workspaceResult.error, status: 500 };
  }

  const pointerResult = await setActiveBookPointer({
    salonId: trimmedSalon,
    analysisId: trimmedAnalysis,
    clientCount: analysis.recordCount,
    recordCount: analysis.recordCount,
    sourceFileName: analysis.parseSummary?.fileName,
  });
  if ("error" in pointerResult) {
    return { ok: false, error: pointerResult.error, status: 500 };
  }

  const latestResult = await setLatestAnalysis(trimmedSalon, trimmedAnalysis);
  if ("error" in latestResult) {
    return { ok: false, error: latestResult.error, status: 500 };
  }

  return { ok: true, analysisId: trimmedAnalysis, salonId: trimmedSalon };
}
