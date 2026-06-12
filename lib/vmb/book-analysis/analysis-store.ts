import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import {
  getLatestVmbBookAnalysisForTrialPostgres,
  getVmbBookAnalysisPostgres,
  listVmbBookAnalysesPostgres,
  saveVmbBookAnalysisPostgres,
} from "@/lib/vmb/book-analysis/analysis-store-postgres";
import { resolveVmbStorageBackend } from "@/lib/vmb/db";
import { assertVmbWritableBackend, vmbJsonFallbackAllowed } from "@/lib/vmb/storage-policy";
import { getVmbBookAnalysisFile } from "../paths";
import { readJsonArray, writeJsonArray } from "../runtime-json-store";

function isAnalysis(item: unknown): item is VmbBookAnalysisResult {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as VmbBookAnalysisResult).analysisId === "string"
  );
}

async function listVmbBookAnalysesJson(): Promise<VmbBookAnalysisResult[]> {
  return readJsonArray(getVmbBookAnalysisFile(), isAnalysis);
}

async function getVmbBookAnalysisJson(id: string): Promise<VmbBookAnalysisResult | undefined> {
  const all = await listVmbBookAnalysesJson();
  return all.find((a) => a.analysisId === id.trim());
}

export async function saveVmbBookAnalysis(
  result: VmbBookAnalysisResult,
): Promise<{ saved: VmbBookAnalysisResult } | { error: string }> {
  const writable = await assertVmbWritableBackend();
  if (!writable.ok) return { error: writable.error };

  if (writable.backend === "postgres") {
    const pg = await saveVmbBookAnalysisPostgres(result);
    if ("error" in pg) return pg;
    if (vmbJsonFallbackAllowed()) {
      const all = await listVmbBookAnalysesJson();
      all.unshift(result);
      await writeJsonArray(getVmbBookAnalysisFile(), all);
    }
    return pg;
  }

  const all = await listVmbBookAnalysesJson();
  all.unshift(result);
  const err = await writeJsonArray(getVmbBookAnalysisFile(), all);
  if (err) return { error: err };
  return { saved: result };
}

export async function listVmbBookAnalyses(): Promise<VmbBookAnalysisResult[]> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    return listVmbBookAnalysesPostgres();
  }
  return listVmbBookAnalysesJson();
}

export async function getVmbBookAnalysis(
  id: string,
): Promise<VmbBookAnalysisResult | undefined> {
  const trimmed = id.trim();
  if (!trimmed) return undefined;

  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    return getVmbBookAnalysisPostgres(trimmed);
  }
  return getVmbBookAnalysisJson(trimmed);
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
  if (!analysis) return undefined;
  if (analysis.trialId && analysis.trialId !== trialId) return undefined;
  return analysis;
}

export async function getLatestVmbBookAnalysisForTrial(
  trialId: string,
): Promise<VmbBookAnalysisResult | undefined> {
  const trimmed = trialId.trim();
  if (!trimmed) return undefined;

  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    return getLatestVmbBookAnalysisForTrialPostgres(trimmed);
  }

  const all = await listVmbBookAnalysesJson();
  return all.find((a) => a.trialId === trimmed);
}

export async function getVmbAnalysisStorageBackend(): Promise<"postgres" | "json"> {
  return resolveVmbStorageBackend();
}
