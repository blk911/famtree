-- VMB durable storage (lazy-applied via lib/vmb/db.ts ensureVmbStorageTables)
-- Mirrors Transpo pattern: CREATE TABLE IF NOT EXISTS on first VMB request.

CREATE TABLE IF NOT EXISTS vmb_book_analysis (
  analysis_id text PRIMARY KEY,
  trial_id text,
  salon_id text,
  record_count integer NOT NULL DEFAULT 0,
  client_count integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vmb_salon_workspace (
  trial_id text PRIMARY KEY,
  salon_id text,
  payload jsonb NOT NULL,
  first_ingest_completed boolean NOT NULL DEFAULT false,
  latest_analysis_id text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vmb_active_book (
  salon_id text PRIMARY KEY,
  analysis_id text NOT NULL,
  record_count integer NOT NULL DEFAULT 0,
  client_count integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vmb_trial_lead (
  trial_id text PRIMARY KEY,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vmb_book_upload (
  upload_id text PRIMARY KEY,
  trial_id text,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vmb_invite_draft (
  draft_id text PRIMARY KEY,
  trial_id text NOT NULL,
  analysis_id text NOT NULL,
  payload jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);
