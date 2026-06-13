import { resolveActiveBook, type ActiveBookResolutionSource } from "@/lib/vmb/active-book-resolver";

export type ActiveVmbAnalysisSource = "query" | "session" | "workspace" | "active-book" | "none";

export type ResolvedActiveVmbAnalysis = {
  analysisId?: string;
  source: ActiveVmbAnalysisSource;
};

export type ActiveVmbAnalysisCandidates = {
  queryId?: string;
  sessionId?: string;
};

function mapResolutionSource(source: ActiveBookResolutionSource): ActiveVmbAnalysisSource {
  if (source === "active_pointer") return "active-book";
  if (source === "latest_analysis") return "workspace";
  if (source === "query") return "query";
  if (source === "workspace") return "workspace";
  return "none";
}

/**
 * Canonical server resolver — delegates to resolveActiveBook().
 */
export async function getActiveVmbAnalysis(
  trialId: string,
  candidates: ActiveVmbAnalysisCandidates = {},
): Promise<ResolvedActiveVmbAnalysis> {
  const resolved = await resolveActiveBook(trialId, candidates);
  if (!resolved.hasActiveBook || !resolved.analysisId) {
    return { source: "none" };
  }

  let source = mapResolutionSource(resolved.source);
  if (candidates.sessionId?.trim() && resolved.source === "query" && !candidates.queryId?.trim()) {
    source = "session";
  }

  return { analysisId: resolved.analysisId, source };
}
