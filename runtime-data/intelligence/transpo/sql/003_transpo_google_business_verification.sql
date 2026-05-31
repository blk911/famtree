-- 003_transpo_google_business_verification.sql
-- Adds Google Business live-enrichment columns to the carrier verification table.
--
-- Applied automatically (ALTER TABLE ... ADD COLUMN IF NOT EXISTS) by
-- lib/intelligence/transpo/db.ts -> ensureTranspoTables(), and registered in
-- prisma/schema.prisma so the Vercel build's `prisma db push` manages them.
-- Apply by hand if preferred:
--   psql "$DATABASE_URL" -f runtime-data/intelligence/transpo/sql/003_transpo_google_business_verification.sql

ALTER TABLE transpo_carrier_verification
  ADD COLUMN IF NOT EXISTS google_place_id        text,
  ADD COLUMN IF NOT EXISTS google_maps_url        text,
  ADD COLUMN IF NOT EXISTS google_address         text,
  ADD COLUMN IF NOT EXISTS google_business_name   text,
  ADD COLUMN IF NOT EXISTS google_category        text,
  ADD COLUMN IF NOT EXISTS google_match_confidence numeric,
  ADD COLUMN IF NOT EXISTS google_matched_by      text;
