-- 004_transpo_website_crawl_verification.sql
-- Adds website crawl-enrichment columns to the carrier verification table.
--
-- Applied automatically (ALTER TABLE ... ADD COLUMN IF NOT EXISTS) by
-- lib/intelligence/transpo/db.ts -> ensureTranspoTables(), and registered in
-- prisma/schema.prisma so the Vercel build's `prisma db push` manages them.
-- Apply by hand if preferred:
--   psql "$DATABASE_URL" -f runtime-data/intelligence/transpo/sql/004_transpo_website_crawl_verification.sql

ALTER TABLE transpo_carrier_verification
  ADD COLUMN IF NOT EXISTS website_fetch_status        text,
  ADD COLUMN IF NOT EXISTS website_http_status         integer,
  ADD COLUMN IF NOT EXISTS website_final_url           text,
  ADD COLUMN IF NOT EXISTS website_title               text,
  ADD COLUMN IF NOT EXISTS website_description         text,
  ADD COLUMN IF NOT EXISTS website_signals             jsonb,
  ADD COLUMN IF NOT EXISTS website_pages_checked       jsonb,
  ADD COLUMN IF NOT EXISTS website_extracted_phones    jsonb,
  ADD COLUMN IF NOT EXISTS website_extracted_emails    jsonb,
  ADD COLUMN IF NOT EXISTS website_hiring_found        boolean,
  ADD COLUMN IF NOT EXISTS website_owner_operator_found boolean,
  ADD COLUMN IF NOT EXISTS website_quote_request_found boolean,
  ADD COLUMN IF NOT EXISTS website_last_fetched_at     timestamptz;
