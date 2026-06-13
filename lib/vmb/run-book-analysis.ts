import { setActiveBookPointer } from "@/lib/vmb/active-book-pointer";
import { setLatestAnalysis } from "@/lib/vmb/workspace-store";
import { analyzeVmbBook } from "@/lib/vmb/book-analysis/analyze-book";
import { saveVmbBookAnalysis } from "@/lib/vmb/book-analysis/analysis-store";
import { saveVmbBookUpload } from "@/lib/vmb/book-upload-store";
import { logVmbFlow } from "@/lib/vmb/flow-log";
import { parseBookUpload } from "@/lib/vmb/provider-ingest/parse-book-upload";
import type { VmbBookRecord } from "@/types/vmb/provider-ingest";
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

export type RunBookAnalysisFromRecordsInput = {
  trialId: string;
  salonName?: string;
  providerPlatform?: VmbProviderPlatform;
  records: VmbBookRecord[];
  sourceType: VmbParseSummary["sourceType"];
  fileName?: string;
  sourceUploadId?: string;
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

  const uploadSaved = await saveVmbBookUpload({
    trialId: input.trialId,
    salonName: input.salonName,
    providerPlatform: input.providerPlatform,
    recordCount: parsed.parsedRecordCount,
    skippedRows: parsed.skippedRows,
    detectedColumns: parsed.detectedColumns,
    parseWarnings: parsed.warnings,
    fileName: input.fileName,
  });
  if (!("error" in uploadSaved)) {
    logVmbFlow("upload saved", {
      trialId: input.trialId,
      salonId: input.trialId,
      workspaceId: input.trialId,
      latestUploadId: uploadSaved.upload.uploadId,
      recordCount: parsed.parsedRecordCount,
      clientCount: parsed.parsedRecordCount,
      fileName: input.fileName,
    });
  }

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

  await finalizeBookAnalysisSave({
    trialId: input.trialId,
    analysis: saved.saved,
    fileName: input.fileName,
    recordCount: parsed.parsedRecordCount,
  });

  return {
    ok: true,
    data: {
      analysis: saved.saved,
      parse: parsed,
    },
  };
}

async function finalizeBookAnalysisSave(input: {
  trialId?: string;
  analysis: VmbBookAnalysisResult;
  fileName?: string;
  recordCount: number;
}): Promise<void> {
  logVmbFlow("analysis written", {
    trialId: input.trialId,
    salonId: input.trialId,
    workspaceId: input.trialId,
    analysisId: input.analysis.analysisId,
    recordCount: input.analysis.recordCount,
    clientCount: input.recordCount,
    opportunityCount:
      input.analysis.reactivationTargets.length +
      input.analysis.referralOpportunities.length +
      input.analysis.giftOpportunities.length +
      input.analysis.trustedProviderIntroOpportunities.length,
  });

  const trialId = input.trialId?.trim();
  if (trialId) {
    await setActiveBookPointer({
      salonId: trialId,
      analysisId: input.analysis.analysisId,
      clientCount: input.analysis.recordCount,
      recordCount: input.analysis.recordCount,
      sourceFileName: input.fileName,
    });
    logVmbFlow("active pointer written", {
      trialId,
      salonId: trialId,
      workspaceId: trialId,
      analysisId: input.analysis.analysisId,
      recordCount: input.analysis.recordCount,
      clientCount: input.recordCount,
    });

    const workspaceUpdate = await setLatestAnalysis(trialId, input.analysis.analysisId);
    if ("error" in workspaceUpdate) {
      logVmbFlow("workspace updated", {
        trialId,
        analysisId: input.analysis.analysisId,
        error: workspaceUpdate.error,
        failed: true,
      });
    }
  }
}

export async function runVmbBookAnalysisFromRecords(
  input: RunBookAnalysisFromRecordsInput,
): Promise<{ ok: true; data: RunBookAnalysisOutput } | { ok: false; error: string }> {
  if (input.records.length === 0) {
    return { ok: false, error: "No client records to analyze" };
  }

  const uploadSaved = await saveVmbBookUpload({
    trialId: input.trialId,
    salonName: input.salonName,
    providerPlatform: input.providerPlatform,
    recordCount: input.records.length,
    skippedRows: 0,
    detectedColumns: ["ggen-normalized"],
    parseWarnings: input.sourceUploadId ? [`sourceUploadId:${input.sourceUploadId}`] : [],
    fileName: input.fileName,
  });
  if (!("error" in uploadSaved)) {
    logVmbFlow("upload saved", {
      trialId: input.trialId,
      salonId: input.trialId,
      workspaceId: input.trialId,
      latestUploadId: uploadSaved.upload.uploadId,
      recordCount: input.records.length,
      clientCount: input.records.length,
      fileName: input.fileName,
      sourceUploadId: input.sourceUploadId,
    });
  }

  const result = analyzeVmbBook({
    trialId: input.trialId,
    salonName: input.salonName,
    providerPlatform: input.providerPlatform,
    records: input.records,
  });

  const analysisWithMeta: VmbBookAnalysisResult = {
    ...result,
    parseSummary: {
      skippedRows: 0,
      warnings: input.sourceUploadId ? [`ggen-bridge:${input.sourceUploadId}`] : [],
      detectedColumns: ["ggen-normalized"],
      sourceType: input.sourceType,
      fileName: input.fileName,
    },
  };

  const saved = await saveVmbBookAnalysis(analysisWithMeta);
  if ("error" in saved) {
    return { ok: false, error: saved.error };
  }

  await finalizeBookAnalysisSave({
    trialId: input.trialId,
    analysis: saved.saved,
    fileName: input.fileName,
    recordCount: input.records.length,
  });

  return {
    ok: true,
    data: {
      analysis: saved.saved,
      parse: {
        records: input.records,
        warnings: [],
        skippedRows: 0,
        detectedColumns: ["ggen-normalized"],
        parsedRecordCount: input.records.length,
        providerMode: input.providerPlatform ?? "generic",
      },
    },
  };
}
