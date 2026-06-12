import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import { prisma, resolveVmbStorageBackend } from "@/lib/vmb/db";

function isAnalysis(item: unknown): item is VmbBookAnalysisResult {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as VmbBookAnalysisResult).analysisId === "string"
  );
}

function parsePayload(raw: unknown): VmbBookAnalysisResult | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    try {
      return parsePayload(JSON.parse(raw) as unknown);
    } catch {
      return undefined;
    }
  }
  return isAnalysis(raw) ? raw : undefined;
}

type AnalysisRow = { payload: unknown };

export async function saveVmbBookAnalysisPostgres(
  result: VmbBookAnalysisResult,
): Promise<{ saved: VmbBookAnalysisResult } | { error: string }> {
  try {
    const backend = await resolveVmbStorageBackend();
    if (backend !== "postgres") return { error: "Postgres backend unavailable" };

    const salonId = result.trialId ?? null;
    const recordCount = result.recordCount ?? 0;

    await prisma.$executeRaw`
      INSERT INTO vmb_book_analysis (
        analysis_id, trial_id, salon_id, record_count, client_count, payload, updated_at
      )
      VALUES (
        ${result.analysisId},
        ${result.trialId ?? null},
        ${salonId},
        ${recordCount},
        ${recordCount},
        ${JSON.stringify(result)}::jsonb,
        now()
      )
      ON CONFLICT (analysis_id) DO UPDATE SET
        trial_id = EXCLUDED.trial_id,
        salon_id = EXCLUDED.salon_id,
        record_count = EXCLUDED.record_count,
        client_count = EXCLUDED.client_count,
        payload = EXCLUDED.payload,
        updated_at = now()
    `;
    return { saved: result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getVmbBookAnalysisPostgres(
  id: string,
): Promise<VmbBookAnalysisResult | undefined> {
  const backend = await resolveVmbStorageBackend();
  if (backend !== "postgres") return undefined;

  try {
    const rows = await prisma.$queryRaw<AnalysisRow[]>`
      SELECT payload FROM vmb_book_analysis WHERE analysis_id = ${id.trim()} LIMIT 1
    `;
    return parsePayload(rows[0]?.payload);
  } catch {
    return undefined;
  }
}

export async function getLatestVmbBookAnalysisForTrialPostgres(
  trialId: string,
): Promise<VmbBookAnalysisResult | undefined> {
  const backend = await resolveVmbStorageBackend();
  if (backend !== "postgres") return undefined;

  try {
    const rows = await prisma.$queryRaw<AnalysisRow[]>`
      SELECT payload FROM vmb_book_analysis
      WHERE trial_id = ${trialId.trim()}
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    return parsePayload(rows[0]?.payload);
  } catch {
    return undefined;
  }
}

export async function listVmbBookAnalysesPostgres(): Promise<VmbBookAnalysisResult[]> {
  const backend = await resolveVmbStorageBackend();
  if (backend !== "postgres") return [];

  try {
    const rows = await prisma.$queryRaw<AnalysisRow[]>`
      SELECT payload FROM vmb_book_analysis ORDER BY updated_at DESC
    `;
    return rows.map((row) => parsePayload(row.payload)).filter((a): a is VmbBookAnalysisResult => !!a);
  } catch {
    return [];
  }
}
