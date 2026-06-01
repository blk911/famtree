-- 001_salon_backoffice_import_runs.sql
-- Owner-approved salon back-office export import runs (GlossGenius, etc.).
-- Created automatically by lib/intelligence/salon/backoffice/db.ts.

CREATE TABLE IF NOT EXISTS salon_backoffice_import_runs (
  id                 text PRIMARY KEY,
  provider           text,
  entity             text,
  file_name          text,
  row_count          integer,
  mapped_count       integer,
  unmapped_headers   jsonb,
  schema_confidence  text,
  normalized_preview jsonb,
  report             jsonb,
  created_at         timestamptz DEFAULT now()
);
