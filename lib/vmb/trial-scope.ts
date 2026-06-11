import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { TrustedProviderIntroRequest } from "@/types/vmb/trusted-circle";

export function analysisBelongsToTrial(
  analysis: VmbBookAnalysisResult | undefined,
  trialId: string,
): boolean {
  return !!analysis && analysis.trialId === trialId;
}

export function introBelongsToTrial(
  request: TrustedProviderIntroRequest,
  trialId: string,
): boolean {
  return request.trialId === trialId;
}

export function filterAnalysesForTrial(
  analyses: VmbBookAnalysisResult[],
  trialId: string,
): VmbBookAnalysisResult[] {
  return analyses.filter((a) => a.trialId === trialId);
}

export function latestAnalysisForTrial(
  analyses: VmbBookAnalysisResult[],
  trialId: string,
): VmbBookAnalysisResult | undefined {
  return analyses.find((a) => a.trialId === trialId);
}

export function filterIntrosForTrial(
  requests: TrustedProviderIntroRequest[],
  trialId: string,
): TrustedProviderIntroRequest[] {
  return requests.filter((r) => r.trialId === trialId);
}

/** Preserve active analysis id (and optional view) across VMB app nav links. */
export function appendVmbAnalysisQuery(
  href: string,
  analysisId?: string,
  view?: string,
): string {
  const id = analysisId?.trim();
  const viewParam = view?.trim();
  if (!id && !viewParam) return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  if (id) params.set("analysis", id);
  if (viewParam) params.set("view", viewParam);
  return `${path}?${params.toString()}`;
}
