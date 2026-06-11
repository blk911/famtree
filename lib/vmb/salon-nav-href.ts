import { appendVmbAnalysisQuery } from "@/lib/vmb/trial-scope";
import type { VmbSalonNavItem } from "@/lib/vmb/salon-nav";

export function buildVmbSalonNavHref(item: VmbSalonNavItem, analysisId?: string): string {
  if (!item.preserveAnalysis || !analysisId?.trim()) return item.href;
  return appendVmbAnalysisQuery(item.href, analysisId.trim());
}
