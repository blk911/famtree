// lib/intelligence/transpo/db.ts
// Durable-storage plumbing for the Transpo intelligence stores.
//
// Backend selection:
//   DATABASE_URL present AND tables ensured → "postgres" (durable)
//   otherwise                              → "json"     (local /tmp fallback)
//
// Tables are created lazily with CREATE TABLE IF NOT EXISTS (idempotent), so no
// separate migration step is required on Vercel — the repo is schema-first
// (db:push, no migrations dir). The matching SQL also lives at
// runtime-data/intelligence/transpo/sql/001_transpo_intelligence_tables.sql.
//
// Nothing here throws on a missing DATABASE_URL: callers degrade to JSON.

import { prisma } from "@/lib/db/prisma";

export type TranspoBackend = "postgres" | "json";

export function databaseUrlPresent(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());
}

const DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS transpo_source_runs (
    id text PRIMARY KEY,
    source text,
    source_mode text,
    provider_kind text,
    input jsonb,
    record_count integer,
    records jsonb,
    message text,
    created_at timestamptz DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS transpo_evidence (
    id text PRIMARY KEY,
    carrier_key text,
    source text,
    evidence_type text,
    value text,
    confidence numeric,
    source_url text,
    observed_at timestamptz DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS transpo_evidence_dedupe
    ON transpo_evidence (carrier_key, source, evidence_type, value)`,
  `CREATE TABLE IF NOT EXISTS transpo_carrier_master (
    id text PRIMARY KEY,
    company_name text,
    dot_number text,
    mc_number text,
    city text,
    state text,
    phone text,
    website text,
    fleet_size integer,
    driver_count integer,
    authority_status text,
    sources jsonb,
    evidence_ids jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  )`,
  // Identity is enforced in code via carrierIdentityKey (id PK). This index just
  // accelerates DOT lookups — kept non-unique to avoid insert failures on messy
  // historical data.
  `CREATE INDEX IF NOT EXISTS transpo_carrier_master_dot
    ON transpo_carrier_master (dot_number)`,
];

// Memoized per serverless isolate: ensure DDL runs at most once per instance.
let _ensurePromise: Promise<boolean> | null = null;

async function ensureTranspoTables(): Promise<boolean> {
  if (!databaseUrlPresent()) return false;
  if (_ensurePromise) return _ensurePromise;

  _ensurePromise = (async () => {
    try {
      for (const stmt of DDL_STATEMENTS) {
        await prisma.$executeRawUnsafe(stmt);
      }
      return true;
    } catch {
      // Reset so a transient failure can be retried on the next call.
      _ensurePromise = null;
      return false;
    }
  })();

  return _ensurePromise;
}

let _resolvedBackend: TranspoBackend | null = null;

/** Resolve (and memoize) the active backend. Falls back to JSON on any DB issue. */
export async function resolveTranspoBackend(): Promise<TranspoBackend> {
  if (_resolvedBackend) return _resolvedBackend;
  const ok = await ensureTranspoTables();
  _resolvedBackend = ok ? "postgres" : "json";
  return _resolvedBackend;
}

export type TranspoBackendInfo = {
  backend: TranspoBackend;
  durable: boolean;
  databaseUrlPresent: boolean;
};

export async function getTranspoBackendInfo(): Promise<TranspoBackendInfo> {
  const backend = await resolveTranspoBackend();
  return {
    backend,
    durable: backend === "postgres",
    databaseUrlPresent: databaseUrlPresent(),
  };
}

export { prisma };
