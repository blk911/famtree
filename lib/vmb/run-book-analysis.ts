import { analyzeVmbBook } from "@/lib/vmb/book-analysis/analyze-book";
import { saveVmbBookAnalysis } from "@/lib/vmb/book-analysis/analysis-store";
import { saveVmbBookUpload } from "@/lib/vmb/book-upload-store";
import { parseBookUpload } from "@/lib/vmb/provider-ingest/parse-book-upload";
import type { VmbBookAnalysisResult, VmbParseSummary } from "@/types/vmb/book-analysis";
import type { ParseBookUploadResult } from "@/types/vmb/provider-ingest";
import type { VmbProviderPlatform } from "@/types/vmb/trial";

export type RunBookAnalysisInput = {
  trialId?: string;
  salonName?: string;
  providerPlatform?: VmbProviderPlatform;
  rawText: string;
  sourceType: VmbParseSummary["sourceType"];
  fileName?: string;
};

export type RunBookAnalysisOutput = {
  analysis: VmbBookAnalysisResult;
  parse: ParseBookUploadResult;
};

export async function runVmbBookAnalysis(
  input: RunBookAnalysisInput,
): Promise<{ ok: true; data: RunBookAnalysisOutput } | { ok: false; error: string; parse?: ParseBookUploadResult }> {
  const parsed = parseBookUpload({
    rawText: input.rawText,
    providerPlatform: input.providerPlatform,
  });

  if (parsed.records.length === 0) {
    return { ok: false, error: "No client records parsed", parse: parsed };
  }

  await saveVmbBookUpload({
    trialId: input.trialId,
    salonName: input.salonName,
    providerPlatform: input.providerPlatform,
    recordCount: parsed.parsedRecordCount,
    skippedRows: parsed.skippedRows,
    detectedColumns: parsed.detectedColumns,
    parseWarnings: parsed.warnings,
    fileName: input.fileName,
  });

  const result = analyzeVmbBook({
    trialId: input.trialId,
    salonName: input.salonName,
    providerPlatform: input.providerPlatform,
    records: parsed.records,
  });

  const analysisWithMeta: VmbBookAnalysisResult = {
    ...result,
    parseSummary: {
      skippedRows: parsed.skippedRows,
      warnings: parsed.warnings,
      detectedColumns: parsed.detectedColumns,
      sourceType: input.sourceType,
      fileName: input.fileName,
    },
  };

  const saved = await saveVmbBookAnalysis(analysisWithMeta);
  if ("error" in saved) {
    return { ok: false, error: saved.error, parse: parsed };
  }

  return {
    ok: true,
    data: {
      analysis: saved.saved,
      parse: parsed,
    },
  };
}
