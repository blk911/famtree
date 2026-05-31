-- 001_transpo_intelligence_tables.sql
-- Durable Postgres tables for the Transpo intelligence stores.
--
-- These are created automatically (CREATE TABLE IF NOT EXISTS) by
-- lib/intelligence/transpo/db.ts -> ensureTranspoTables() on first use when
-- DATABASE_URL is present, so no manual migration step is required on Vercel.
-- This file documents the schema and can be applied by hand if preferred:
--   psql "$DATABASE_URL" -f runtime-data/intelligence/transpo/sql/001_transpo_intelligence_tables.sql

CREATE TABLE IF NOT EXISTS transpo_source_runs (
  id            text PRIMARY KEY,
  source        text,
  source_mode   text,
  provider_kind text,
  input         jsonb,
  record_count  integer,
  records       jsonb,
  message       text,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transpo_evidence (
  id            text PRIMARY KEY,
  carrier_key   text,
  source        text,
  evidence_type text,
  value         text,
  confidence    numeric,
  source_url    text,
  observed_at   timestamptz DEFAULT now()
);

-- De-dupe identical evidence (carrier_key + source + type + value).
CREATE UNIQUE INDEX IF NOT EXISTS transpo_evidence_dedupe
  ON transpo_evidence (carrier_key, source, evidence_type, value);

CREATE TABLE IF NOT EXISTS transpo_carrier_master (
  id               text PRIMARY KEY,
  company_name     text,
  dot_number       text,
  mc_number        text,
  city             text,
  state            text,
  phone            text,
  website          text,
  fleet_size       integer,
  driver_count     integer,
  authority_status text,
  sources          jsonb,
  evidence_ids     jsonb,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Identity is enforced in application code via carrierIdentityKey (the row id is
-- derived from it). This index just accelerates DOT lookups; kept non-unique to
-- avoid insert failures on messy historical data. To enforce DOT uniqueness at
-- the DB level instead, replace with:
--   CREATE UNIQUE INDEX transpo_carrier_master_dot_uniq
--     ON transpo_carrier_master (dot_number) WHERE dot_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS transpo_carrier_master_dot
  ON transpo_carrier_master (dot_number);
