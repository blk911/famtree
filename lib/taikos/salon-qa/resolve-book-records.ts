import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { VmbBookRecord } from "@/types/vmb/provider-ingest";
import { loadVmbDemoSeedBookText } from "@/lib/vmb/demo-seed-book";
import { parseBookUpload } from "@/lib/vmb/provider-ingest/parse-book-upload";
import { VMB_SAMPLE_BOOK_TEXT } from "@/lib/vmb/sample-book";
import { inferBookRecordsFromAnalysis, mergeBookRecords } from "./infer-book-records";

function parseRecordsFromText(
  rawText: string,
  providerPlatform?: VmbBookAnalysisResult["providerPlatform"],
): VmbBookRecord[] {
  const parsed = parseBookUpload({ rawText, providerPlatform });
  return parsed.records;
}

/** Resolve book records for salon Q&A without changing ingest or storage schema. */
export async function resolveBookRecordsForSalonQa(
  analysis: VmbBookAnalysisResult,
  explicitRecords?: VmbBookRecord[],
): Promise<VmbBookRecord[]> {
  if (explicitRecords?.length) return explicitRecords;

  if (analysis.parseSummary?.sourceType === "sample") {
    const sample = parseRecordsFromText(VMB_SAMPLE_BOOK_TEXT, analysis.providerPlatform);
    if (sample.length > 0) {
      return mergeBookRecords(sample, inferBookRecordsFromAnalysis(analysis));
    }
  }

  if ((analysis.recordCount ?? 0) >= 50 || analysis.parseSummary?.fileName === "book.csv") {
    try {
      const demoText = await loadVmbDemoSeedBookText();
      const demo = parseRecordsFromText(demoText, analysis.providerPlatform);
      if (demo.length > 0) {
        return mergeBookRecords(demo, inferBookRecordsFromAnalysis(analysis));
      }
    } catch {
      // fall through to inferred records
    }
  }

  return inferBookRecordsFromAnalysis(analysis);
}

export function resolveBookRecordsSync(
  analysis: VmbBookAnalysisResult,
  explicitRecords?: VmbBookRecord[],
): VmbBookRecord[] {
  if (explicitRecords?.length) return explicitRecords;

  if (analysis.parseSummary?.sourceType === "sample") {
    const sample = parseRecordsFromText(VMB_SAMPLE_BOOK_TEXT, analysis.providerPlatform);
    if (sample.length > 0) {
      return mergeBookRecords(sample, inferBookRecordsFromAnalysis(analysis));
    }
  }

  return inferBookRecordsFromAnalysis(analysis);
}
