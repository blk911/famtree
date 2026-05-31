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
  `CREATE TABLE IF NOT EXISTS transpo_carrier_verification (
    id text PRIMARY KEY,
    carrier_id text,
    carrier_key text,
    dot_number text,
    company_name text,
    city text,
    state text,
    google_found boolean,
    google_rating numeric,
    google_review_count integer,
    google_website text,
    google_phone text,
    bbb_found boolean,
    bbb_rating text,
    bbb_complaint_count integer,
    facebook_found boolean,
    facebook_url text,
    state_entity_found boolean,
    entity_status text,
    formation_date text,
    website_found boolean,
    website_url text,
    address_type text,
    verification_score integer,
    verification_status text,
    notes jsonb,
    providers_checked jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  )`,
  // De-dupe verification rows by carrier_id (one verification per carrier).
  `CREATE UNIQUE INDEX IF NOT EXISTS transpo_carrier_verification_carrier
    ON transpo_carrier_verification (carrier_id)`,
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

/**
 * Resolve the active backend.
 *
 * Only a successful Postgres resolution is cached. If DATABASE_URL is present
 * but the tables aren't ready yet (e.g. a cold-start connection blip), we return
 * "json" WITHOUT caching so the next call retries Postgres — otherwise a single
 * transient failure would strand a warm Lambda on ephemeral /tmp for its whole
 * life, which is exactly the "evidence randomly disappears" symptom.
 */
export async function resolveTranspoBackend(): Promise<TranspoBackend> {
  if (_resolvedBackend === "postgres") return "postgres";

  if (!databaseUrlPresent()) {
    _resolvedBackend = "json";
    return "json";
  }

  const ok = await ensureTranspoTables();
  if (ok) {
    _resolvedBackend = "postgres";
    return "postgres";
  }

  // DB configured but not ready — do not pin; retry on the next call.
  return "json";
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
