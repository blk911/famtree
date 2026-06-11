import type { ActiveVmbAnalysisSource, ResolvedActiveVmbAnalysis } from "@/lib/vmb/active-analysis-resolver";
import { writeActiveAnalysisId } from "@/lib/vmb/active-analysis";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

type AnalyzeBookResponse = {
  ok: boolean;
  data?: VmbBookAnalysisResult | null;
  error?: string;
};

async function fetchAnalysisById(id: string): Promise<VmbBookAnalysisResult | undefined> {
  const res = await fetch(`/api/vmb/analyze-book?id=${encodeURIComponent(id)}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (res.status === 401) return undefined;
  const json = (await res.json()) as AnalyzeBookResponse;
  return json.ok && json.data ? json.data : undefined;
}

async function fetchLatestAnalysis(): Promise<VmbBookAnalysisResult | undefined> {
  const res = await fetch("/api/vmb/analyze-book", {
    cache: "no-store",
    credentials: "include",
  });
  if (res.status === 401) return undefined;
  const json = (await res.json()) as AnalyzeBookResponse;
  return json.ok && json.data ? json.data : undefined;
}

/**
 * Canonical client resolver — mirrors getActiveVmbAnalysis() via trial-scoped APIs.
 */
export async function resolveActiveVmbAnalysisClient(candidates: {
  queryId?: string;
  sessionId?: string;
}): Promise<ResolvedActiveVmbAnalysis> {
  const queryId = candidates.queryId?.trim();
  if (queryId) {
    const analysis = await fetchAnalysisById(queryId);
    if (analysis) {
      writeActiveAnalysisId(analysis.analysisId);
      return { analysisId: analysis.analysisId, source: "query" };
    }
  }

  const sessionId = candidates.sessionId?.trim();
  if (sessionId && sessionId !== queryId) {
    const analysis = await fetchAnalysisById(sessionId);
    if (analysis) {
      writeActiveAnalysisId(analysis.analysisId);
      return { analysisId: analysis.analysisId, source: "session" };
    }
  }

  const latest = await fetchLatestAnalysis();
  if (latest) {
    writeActiveAnalysisId(latest.analysisId);
    return { analysisId: latest.analysisId, source: "workspace" };
  }

  return { source: "none" };
}

export type FetchVmbAnalysisResult =
  | { ok: true; data: VmbBookAnalysisResult; source: ActiveVmbAnalysisSource }
  | { ok: false; reason: "no_session" | "no_analysis" | "error"; error?: string };

/** Load analysis using resolved active id with latest fallback. */
export async function fetchVmbAnalysisForSalon(
  resolved: ResolvedActiveVmbAnalysis,
): Promise<FetchVmbAnalysisResult> {
  if (resolved.analysisId) {
    const analysis = await fetchAnalysisById(resolved.analysisId);
    if (analysis) {
      return { ok: true, data: analysis, source: resolved.source };
    }
  }

  const latest = await fetchLatestAnalysis();
  if (latest) {
    writeActiveAnalysisId(latest.analysisId);
    return { ok: true, data: latest, source: "workspace" };
  }

  return { ok: false, reason: "no_analysis" };
}
