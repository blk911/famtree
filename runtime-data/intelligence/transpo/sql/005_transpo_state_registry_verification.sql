-- 005_transpo_state_registry_verification.sql
-- Adds state business-registry enrichment columns (Colorado SOS first) to the
-- carrier verification table.
--
-- Applied automatically (ALTER TABLE ... ADD COLUMN IF NOT EXISTS) by
-- lib/intelligence/transpo/db.ts -> ensureTranspoTables(), and registered in
-- prisma/schema.prisma so the Vercel build's `prisma db push` manages them.
-- Apply by hand if preferred:
--   psql "$DATABASE_URL" -f runtime-data/intelligence/transpo/sql/005_transpo_state_registry_verification.sql

ALTER TABLE transpo_carrier_verification
  ADD COLUMN IF NOT EXISTS state_registry_provider      text,
  ADD COLUMN IF NOT EXISTS state_entity_name            text,
  ADD COLUMN IF NOT EXISTS state_entity_id              text,
  ADD COLUMN IF NOT EXISTS state_entity_url             text,
  ADD COLUMN IF NOT EXISTS entity_good_standing         boolean,
  ADD COLUMN IF NOT EXISTS entity_formation_date        text,
  ADD COLUMN IF NOT EXISTS entity_age_months            integer,
  ADD COLUMN IF NOT EXISTS state_name_match_confidence  numeric;
