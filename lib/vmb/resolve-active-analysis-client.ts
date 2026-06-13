import type { ActiveVmbAnalysisSource, ResolvedActiveVmbAnalysis } from "@/lib/vmb/active-analysis-resolver";
import { writeActiveAnalysisId } from "@/lib/vmb/active-analysis";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { ActiveBookResolutionSource } from "@/lib/vmb/active-book-resolver";

type ActiveBookApiResponse = {
  ok: boolean;
  data?: {
    hasActiveBook: boolean;
    analysisId?: string;
    clientCount?: number;
    recordCount?: number;
    updatedAt?: string;
    source: ActiveBookResolutionSource;
    analysis?: VmbBookAnalysisResult;
  } | null;
  error?: string;
};

function mapApiSourceToClient(source: ActiveBookResolutionSource): ActiveVmbAnalysisSource {
  if (source === "active_pointer") return "active-book";
  if (source === "latest_analysis") return "workspace";
  if (source === "query") return "query";
  if (source === "workspace") return "workspace";
  return "none";
}

async function fetchActiveBookResolution(candidates: {
  queryId?: string;
  sessionId?: string;
}): Promise<ActiveBookApiResponse["data"]> {
  const params = new URLSearchParams();
  if (candidates.queryId?.trim()) params.set("analysis", candidates.queryId.trim());
  if (candidates.sessionId?.trim()) params.set("session", candidates.sessionId.trim());
  const qs = params.toString();
  const res = await fetch(`/api/vmb/active-book${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (res.status === 401) return null;
  const json = (await res.json()) as ActiveBookApiResponse;
  return json.ok ? (json.data ?? null) : null;
}

async function fetchAnalysisById(id: string): Promise<VmbBookAnalysisResult | undefined> {
  const res = await fetch(`/api/vmb/analyze-book?id=${encodeURIComponent(id)}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (res.status === 401) return undefined;
  const json = (await res.json()) as { ok: boolean; data?: VmbBookAnalysisResult | null };
  return json.ok && json.data ? json.data : undefined;
}

/**
 * Canonical client resolver — mirrors resolveActiveBook() via /api/vmb/active-book.
 */
export async function resolveActiveVmbAnalysisClient(candidates: {
  queryId?: string;
  sessionId?: string;
}): Promise<ResolvedActiveVmbAnalysis> {
  const resolution = await fetchActiveBookResolution(candidates);
  if (resolution?.hasActiveBook && resolution.analysisId) {
    writeActiveAnalysisId(resolution.analysisId);
    let source = mapApiSourceToClient(resolution.source);
    if (candidates.sessionId?.trim() && resolution.source === "query" && !candidates.queryId?.trim()) {
      source = "session";
    }
    return { analysisId: resolution.analysisId, source };
  }

  return { source: "none" };
}

export type FetchVmbAnalysisResult =
  | { ok: true; data: VmbBookAnalysisResult; source: ActiveVmbAnalysisSource }
  | { ok: false; reason: "no_session" | "no_analysis" | "error"; error?: string };

/** Load analysis using resolved active id with shared resolver fallback. */
export async function fetchVmbAnalysisForSalon(
  resolved: ResolvedActiveVmbAnalysis,
): Promise<FetchVmbAnalysisResult> {
  const resolution = await fetchActiveBookResolution({
    queryId: resolved.analysisId,
    sessionId: resolved.analysisId,
  });

  if (resolution?.analysis) {
    writeActiveAnalysisId(resolution.analysis.analysisId);
    return {
      ok: true,
      data: resolution.analysis,
      source: mapApiSourceToClient(resolution.source),
    };
  }

  if (resolved.analysisId) {
    const analysis = await fetchAnalysisById(resolved.analysisId);
    if (analysis) {
      return { ok: true, data: analysis, source: resolved.source };
    }
  }

  return { ok: false, reason: "no_analysis" };
}
