-- 006_transpo_carrier_reviews.sql
-- Human review layer: one review row per carrier (approved / rejected /
-- needs_verification / watchlist / unreviewed). Approved carriers become the
-- qualified target queue.
--
-- Created automatically (CREATE TABLE IF NOT EXISTS) by
-- lib/intelligence/transpo/db.ts -> ensureTranspoTables(), and registered in
-- prisma/schema.prisma so the Vercel build's `prisma db push` manages it.
-- Apply by hand if preferred:
--   psql "$DATABASE_URL" -f runtime-data/intelligence/transpo/sql/006_transpo_carrier_reviews.sql

CREATE TABLE IF NOT EXISTS transpo_carrier_reviews (
  carrier_id    text PRIMARY KEY,
  review_status text,
  review_notes  text,
  reviewed_by   text,
  reviewed_at   timestamptz,
  approved_at   timestamptz,
  rejected_at   timestamptz,
  updated_at    timestamptz DEFAULT now()
);
