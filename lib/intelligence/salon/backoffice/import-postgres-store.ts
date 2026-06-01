// lib/intelligence/salon/backoffice/import-postgres-store.ts

import { prisma } from "./db";
import type { SalonBackOfficeImportRun } from "./types";

interface DbRow {
  id: string;
  provider: string | null;
  entity: string | null;
  file_name: string | null;
  row_count: number | null;
  mapped_count: number | null;
  unmapped_headers: unknown;
  schema_confidence: string | null;
  normalized_preview: unknown;
  report: unknown;
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

function rowToRun(row: DbRow): SalonBackOfficeImportRun {
  return {
    id: row.id,
    provider: (row.provider ?? "unknown") as SalonBackOfficeImportRun["provider"],
    entity: (row.entity ?? "unknown") as SalonBackOfficeImportRun["entity"],
    fileName: row.file_name ?? "",
    rowCount: row.row_count ?? 0,
    mappedCount: row.mapped_count ?? 0,
    unmappedHeaders: parseJson<string[]>(row.unmapped_headers, []),
    schemaConfidence: (row.schema_confidence ?? "low") as SalonBackOfficeImportRun["schemaConfidence"],
    normalizedPreview: parseJson(row.normalized_preview, []),
    report: parseJson(row.report, undefined),
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : (row.created_at as string) ?? new Date().toISOString(),
  };
}

export async function readRunsPostgres(): Promise<SalonBackOfficeImportRun[]> {
  try {
    const rows = await prisma.$queryRaw<DbRow[]>`
      SELECT * FROM salon_backoffice_import_runs ORDER BY created_at DESC
    `;
    return rows.map(rowToRun);
  } catch {
    return [];
  }
}

export async function getRunPostgres(id: string): Promise<SalonBackOfficeImportRun | undefined> {
  try {
    const rows = await prisma.$queryRaw<DbRow[]>`
      SELECT * FROM salon_backoffice_import_runs WHERE id = ${id}
    `;
    return rows[0] ? rowToRun(rows[0]) : undefined;
  } catch {
    return undefined;
  }
}

export async function appendRunPostgres(run: SalonBackOfficeImportRun): Promise<string | null> {
  try {
    await prisma.$executeRaw`
      INSERT INTO salon_backoffice_import_runs (
        id, provider, entity, file_name, row_count, mapped_count,
        unmapped_headers, schema_confidence, normalized_preview, report, created_at
      ) VALUES (
        ${run.id},
        ${run.provider},
        ${run.entity},
        ${run.fileName},
        ${run.rowCount},
        ${run.mappedCount},
        ${JSON.stringify(run.unmappedHeaders)}::jsonb,
        ${run.schemaConfidence},
        ${JSON.stringify(run.normalizedPreview)}::jsonb,
        ${JSON.stringify(run.report ?? null)}::jsonb,
        ${run.createdAt ? new Date(run.createdAt) : new Date()}
      )
      ON CONFLICT (id) DO UPDATE SET
        provider = EXCLUDED.provider,
        entity = EXCLUDED.entity,
        file_name = EXCLUDED.file_name,
        row_count = EXCLUDED.row_count,
        mapped_count = EXCLUDED.mapped_count,
        unmapped_headers = EXCLUDED.unmapped_headers,
        schema_confidence = EXCLUDED.schema_confidence,
        normalized_preview = EXCLUDED.normalized_preview,
        report = EXCLUDED.report
    `;
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
