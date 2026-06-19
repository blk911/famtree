import { listVmbBookAnalyses } from "@/lib/vmb/book-analysis/analysis-store";
import { resolveVmbStorageBackend } from "@/lib/vmb/db";
import type {
  VmbBookAnalysisCatalogItem,
  VmbBookAnalysisCatalogResponse,
} from "@/types/vmb/book-analysis-catalog";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

function sourceNameFromAnalysis(analysis: VmbBookAnalysisResult): string | undefined {
  const fileName = analysis.parseSummary?.fileName?.trim();
  if (fileName) return fileName;
  const sourceType = analysis.parseSummary?.sourceType;
  if (sourceType === "sample") return "sample book";
  if (sourceType === "csv_upload") return "csv upload";
  if (sourceType === "paste") return "paste";
  return undefined;
}

function toCatalogItem(analysis: VmbBookAnalysisResult): VmbBookAnalysisCatalogItem {
  return {
    analysisId: analysis.analysisId,
    salonId: analysis.trialId?.trim() || "unknown",
    clientCount: analysis.recordCount,
    createdAt: analysis.generatedAt,
    sourceName: sourceNameFromAnalysis(analysis),
  };
}

/** Lists analyses from the active storage backend for operator restore. */
export async function listBookAnalysisCatalog(
  currentSalonId?: string,
): Promise<VmbBookAnalysisCatalogResponse> {
  const backend = await resolveVmbStorageBackend();
  const all = await listVmbBookAnalyses();
  const analyses = all.map(toCatalogItem);
  return {
    backend,
    currentSalonId: currentSalonId?.trim() || undefined,
    analyses,
  };
}
