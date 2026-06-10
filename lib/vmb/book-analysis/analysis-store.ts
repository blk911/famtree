import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import { getVmbBookAnalysisFile } from "../paths";
import { readJsonArray, writeJsonArray } from "../runtime-json-store";

function isAnalysis(item: unknown): item is VmbBookAnalysisResult {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as VmbBookAnalysisResult).analysisId === "string"
  );
}

export async function saveVmbBookAnalysis(
  result: VmbBookAnalysisResult,
): Promise<{ saved: VmbBookAnalysisResult } | { error: string }> {
  const all = await listVmbBookAnalyses();
  all.unshift(result);
  const err = await writeJsonArray(getVmbBookAnalysisFile(), all);
  if (err) return { error: err };
  return { saved: result };
}

export async function listVmbBookAnalyses(): Promise<VmbBookAnalysisResult[]> {
  return readJsonArray(getVmbBookAnalysisFile(), isAnalysis);
}

export async function getVmbBookAnalysis(
  id: string,
): Promise<VmbBookAnalysisResult | undefined> {
  const all = await listVmbBookAnalyses();
  return all.find((a) => a.analysisId === id);
}

/** @deprecated Public APIs must use getLatestVmbBookAnalysisForTrial instead. */
export async function getLatestVmbBookAnalysis(): Promise<VmbBookAnalysisResult | undefined> {
  const all = await listVmbBookAnalyses();
  return all[0];
}

export async function getVmbBookAnalysisForTrial(
  id: string,
  trialId: string,
): Promise<VmbBookAnalysisResult | undefined> {
  const analysis = await getVmbBookAnalysis(id);
  if (!analysis || analysis.trialId !== trialId) return undefined;
  return analysis;
}

export async function getLatestVmbBookAnalysisForTrial(
  trialId: string,
): Promise<VmbBookAnalysisResult | undefined> {
  const all = await listVmbBookAnalyses();
  return all.find((a) => a.trialId === trialId);
}
