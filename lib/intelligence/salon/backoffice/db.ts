// lib/intelligence/salon/backoffice/db.ts
// Durable storage plumbing for salon back-office import runs (isolated from Transpo).

import { prisma } from "@/lib/db/prisma";

export type SalonBackOfficeBackend = "postgres" | "json";

export function databaseUrlPresent(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());
}

const DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS salon_backoffice_import_runs (
    id text PRIMARY KEY,
    provider text,
    entity text,
    file_name text,
    row_count integer,
    mapped_count integer,
    unmapped_headers jsonb,
    schema_confidence text,
    normalized_preview jsonb,
    report jsonb,
    created_at timestamptz DEFAULT now()
  )`,
];

let _ensurePromise: Promise<boolean> | null = null;

async function ensureSalonBackOfficeTables(): Promise<boolean> {
  if (!databaseUrlPresent()) return false;
  if (_ensurePromise) return _ensurePromise;

  _ensurePromise = (async () => {
    try {
      await prisma.$executeRawUnsafe("SELECT 1");
    } catch {
      _ensurePromise = null;
      return false;
    }
    for (const stmt of DDL_STATEMENTS) {
      try {
        await prisma.$executeRawUnsafe(stmt);
      } catch {
        // idempotent DDL — ignore concurrent/race failures
      }
    }
    return true;
  })();

  return _ensurePromise;
}

let _resolvedBackend: SalonBackOfficeBackend | null = null;

export async function resolveSalonBackOfficeBackend(): Promise<SalonBackOfficeBackend> {
  if (_resolvedBackend === "postgres") return "postgres";
  if (!databaseUrlPresent()) {
    _resolvedBackend = "json";
    return "json";
  }
  const ok = await ensureSalonBackOfficeTables();
  if (ok) {
    _resolvedBackend = "postgres";
    return "postgres";
  }
  return "json";
}

export { prisma };
