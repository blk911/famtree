-- 002_transpo_carrier_verification.sql
-- Durable Postgres table for the Transpo carrier verification layer.
--
-- Created automatically (CREATE TABLE IF NOT EXISTS) by
-- lib/intelligence/transpo/db.ts -> ensureTranspoTables() on first use when
-- DATABASE_URL is present. Also registered in prisma/schema.prisma so the
-- Vercel build's `prisma db push` manages (does not drop) the table.
-- Apply by hand if preferred:
--   psql "$DATABASE_URL" -f runtime-data/intelligence/transpo/sql/002_transpo_carrier_verification.sql

CREATE TABLE IF NOT EXISTS transpo_carrier_verification (
  id                  text PRIMARY KEY,
  carrier_id          text,
  carrier_key         text,
  dot_number          text,
  company_name        text,
  city                text,
  state               text,
  google_found        boolean,
  google_rating       numeric,
  google_review_count integer,
  google_website      text,
  google_phone        text,
  bbb_found           boolean,
  bbb_rating          text,
  bbb_complaint_count integer,
  facebook_found      boolean,
  facebook_url        text,
  state_entity_found  boolean,
  entity_status       text,
  formation_date      text,
  website_found       boolean,
  website_url         text,
  address_type        text,
  verification_score  integer,
  verification_status text,
  notes               jsonb,
  providers_checked   jsonb,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- One verification row per carrier (de-dupe by carrier_id).
CREATE UNIQUE INDEX IF NOT EXISTS transpo_carrier_verification_carrier
  ON transpo_carrier_verification (carrier_id);
