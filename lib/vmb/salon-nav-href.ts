import { buildVmbSalonHref } from "@/lib/vmb/salon-href";
import type { VmbSalonNavItem } from "@/lib/vmb/salon-nav";

export function buildVmbSalonNavHref(item: VmbSalonNavItem, analysisId?: string): string {
  if (!item.preserveAnalysis) return item.href;
  return buildVmbSalonHref(item.href, analysisId);
}
