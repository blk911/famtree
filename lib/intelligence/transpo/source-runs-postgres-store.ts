// lib/intelligence/transpo/source-runs-postgres-store.ts
// Postgres implementation of the Transpo source-runs store (table:
// transpo_source_runs). Uses raw SQL via prisma.$queryRaw/$executeRaw — the dev
// server can hold the Prisma engine open, so we never depend on a generated
// model type. Routed in from source-runs-store.ts when DATABASE_URL is set.

import { prisma } from "./db";
import type { TranspoSourceRun, TranspoSourceRunInput, TranspoCarrierSourceRecord } from "./types";

interface DbRunRow {
  id: string;
  source: string | null;
  source_mode: string | null;
  provider_kind: string | null;
  input: unknown;
  record_count: number | null;
  records: unknown;
  message: string | null;
  created_at: Date | string | null;
}

function parseJson<T>(col: unknown, fallback: T): T {
  if (col === null || col === undefined) return fallback;
  if (typeof col === "string") {
    try {
      return JSON.parse(col) as T;
    } catch {
      return fallback;
    }
  }
  return col as T;
}

function toIso(v: Date | string | null): string {
  if (!v) return new Date().toISOString();
  return v instanceof Date ? v.toISOString() : v;
}

function rowToRun(row: DbRunRow): TranspoSourceRun {
  return {
    id: row.id,
    vertical: "transpo",
    source: (row.source ?? "fmcsa") as TranspoSourceRun["source"],
    sourceMode: (row.source_mode ?? "unknown") as TranspoSourceRun["sourceMode"],
    input: parseJson<TranspoSourceRunInput>(row.input, {}),
    recordCount: row.record_count ?? 0,
    records: parseJson<TranspoCarrierSourceRecord[]>(row.records, []),
    createdAt: toIso(row.created_at),
    ...(row.provider_kind ? { providerKind: row.provider_kind } : {}),
    ...(row.message ? { message: row.message } : {}),
  };
}

export async function readRunsPostgres(): Promise<TranspoSourceRun[]> {
  try {
    const rows = await prisma.$queryRaw<DbRunRow[]>`
      SELECT * FROM transpo_source_runs ORDER BY created_at DESC
    `;
    return rows.map(rowToRun);
  } catch {
    return [];
  }
}

/** Insert a run. Returns null on success or an error message (never throws). */
export async function appendRunPostgres(run: TranspoSourceRun): Promise<string | null> {
  try {
    await prisma.$executeRaw`
      INSERT INTO transpo_source_runs (
        id, source, source_mode, provider_kind, input, record_count, records, message, created_at
      ) VALUES (
        ${run.id},
        ${run.source},
        ${run.sourceMode},
        ${run.providerKind ?? null},
        ${JSON.stringify(run.input ?? {})}::jsonb,
        ${run.recordCount ?? 0},
        ${JSON.stringify(run.records ?? [])}::jsonb,
        ${run.message ?? null},
        ${run.createdAt ? new Date(run.createdAt) : new Date()}
      )
      ON CONFLICT (id) DO UPDATE SET
        source        = EXCLUDED.source,
        source_mode   = EXCLUDED.source_mode,
        provider_kind = EXCLUDED.provider_kind,
        input         = EXCLUDED.input,
        record_count  = EXCLUDED.record_count,
        records       = EXCLUDED.records,
        message       = EXCLUDED.message
    `;
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export async function countRunsPostgres(): Promise<number> {
  try {
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM transpo_source_runs
    `;
    return Number(result[0]?.count ?? 0);
  } catch {
    return 0;
  }
}
