import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

export function normalizeVmbBookAnalysisResult(
  raw: VmbBookAnalysisResult | null | undefined,
): VmbBookAnalysisResult | null {
  if (!raw || typeof raw !== "object") return null;

  return {
    ...raw,
    analysisId: String(raw.analysisId ?? ""),
    recordCount: Number(raw.recordCount) || 0,
    estimatedRecoverableRevenue: Number(raw.estimatedRecoverableRevenue) || 0,
    reactivationTargets: Array.isArray(raw.reactivationTargets) ? raw.reactivationTargets : [],
    referralOpportunities: Array.isArray(raw.referralOpportunities)
      ? raw.referralOpportunities
      : [],
    giftOpportunities: Array.isArray(raw.giftOpportunities) ? raw.giftOpportunities : [],
    trustedProviderIntroOpportunities: Array.isArray(raw.trustedProviderIntroOpportunities)
      ? raw.trustedProviderIntroOpportunities
      : [],
  };
}

export function analysisHasOpportunityArrays(analysis: VmbBookAnalysisResult): boolean {
  const n = normalizeVmbBookAnalysisResult(analysis);
  if (!n) return false;
  return (
    n.reactivationTargets.length > 0 ||
    n.referralOpportunities.length > 0 ||
    n.giftOpportunities.length > 0 ||
    n.trustedProviderIntroOpportunities.length > 0
  );
}
