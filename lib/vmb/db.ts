import { prisma } from "@/lib/db/prisma";

export type VmbStorageBackend = "postgres" | "json";

export function vmbDatabaseUrlPresent(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

const DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS vmb_book_analysis (
    analysis_id text PRIMARY KEY,
    trial_id text,
    salon_id text,
    record_count integer NOT NULL DEFAULT 0,
    client_count integer NOT NULL DEFAULT 0,
    payload jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS vmb_book_analysis_trial_id
    ON vmb_book_analysis (trial_id)`,
  `CREATE INDEX IF NOT EXISTS vmb_book_analysis_updated_at
    ON vmb_book_analysis (updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS vmb_salon_workspace (
    trial_id text PRIMARY KEY,
    salon_id text,
    payload jsonb NOT NULL,
    first_ingest_completed boolean NOT NULL DEFAULT false,
    latest_analysis_id text,
    updated_at timestamptz DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS vmb_salon_workspace_updated_at
    ON vmb_salon_workspace (updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS vmb_active_book (
    salon_id text PRIMARY KEY,
    analysis_id text NOT NULL,
    record_count integer NOT NULL DEFAULT 0,
    client_count integer NOT NULL DEFAULT 0,
    payload jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS vmb_trial_lead (
    trial_id text PRIMARY KEY,
    payload jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS vmb_book_upload (
    upload_id text PRIMARY KEY,
    trial_id text,
    payload jsonb NOT NULL,
    created_at timestamptz DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS vmb_book_upload_trial_id
    ON vmb_book_upload (trial_id)`,
  `CREATE TABLE IF NOT EXISTS vmb_invite_draft (
    draft_id text PRIMARY KEY,
    trial_id text NOT NULL,
    analysis_id text NOT NULL,
    payload jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS vmb_invite_draft_trial_analysis
    ON vmb_invite_draft (trial_id, analysis_id)`,
  `CREATE TABLE IF NOT EXISTS vmb_card_template (
    id text PRIMARY KEY,
    salon_id text,
    type text NOT NULL,
    name text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS vmb_card_template_salon_type
    ON vmb_card_template (salon_id, type)`,
  `CREATE TABLE IF NOT EXISTS vmb_offer (
    id text PRIMARY KEY,
    salon_id text,
    category text NOT NULL,
    name text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    source text,
    confidence numeric,
    payload jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS vmb_offer_salon_category
    ON vmb_offer (salon_id, category)`,
  `CREATE TABLE IF NOT EXISTS vmb_service (
    id text PRIMARY KEY,
    salon_id text,
    category text NOT NULL,
    name text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    display_order integer NOT NULL DEFAULT 0,
    payload jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS vmb_service_salon_id
    ON vmb_service (salon_id)`,
  `CREATE TABLE IF NOT EXISTS vmb_service_option (
    id text PRIMARY KEY,
    salon_id text,
    service_id text NOT NULL,
    name text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    display_order integer NOT NULL DEFAULT 0,
    payload jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS vmb_service_option_salon_service
    ON vmb_service_option (salon_id, service_id)`,
  `CREATE TABLE IF NOT EXISTS vmb_salon_service_config (
    salon_id text NOT NULL,
    catalog_service_id text NOT NULL,
    payload jsonb NOT NULL,
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (salon_id, catalog_service_id)
  )`,
  `CREATE INDEX IF NOT EXISTS vmb_salon_service_config_salon_id
    ON vmb_salon_service_config (salon_id)`,
  `CREATE TABLE IF NOT EXISTS vmb_service_preset (
    id text PRIMARY KEY,
    payload jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS vmb_salon_service_signoff (
    salon_id text PRIMARY KEY,
    payload jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS vmb_salon_offer_catalog (
    salon_id text NOT NULL,
    offer_id text NOT NULL,
    payload jsonb NOT NULL,
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (salon_id, offer_id)
  )`,
  `CREATE INDEX IF NOT EXISTS vmb_salon_offer_catalog_salon_id
    ON vmb_salon_offer_catalog (salon_id)`,
  `CREATE TABLE IF NOT EXISTS vmb_invite_template (
    id text PRIMARY KEY,
    category_id text NOT NULL,
    payload jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS vmb_invite_template_category_id
    ON vmb_invite_template (category_id)`,
  `CREATE TABLE IF NOT EXISTS vmb_salon_invite_copy (
    id text PRIMARY KEY,
    salon_id text NOT NULL,
    source_template_id text NOT NULL,
    published_version integer NOT NULL DEFAULT 1,
    payload jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS vmb_salon_invite_copy_salon_id
    ON vmb_salon_invite_copy (salon_id)`,
  `CREATE INDEX IF NOT EXISTS vmb_salon_invite_copy_salon_source
    ON vmb_salon_invite_copy (salon_id, source_template_id)`,
  `CREATE TABLE IF NOT EXISTS vmb_invite_event (
    event_id text PRIMARY KEY,
    event_type text NOT NULL,
    salon_id text NOT NULL,
    occurred_at timestamptz NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamptz DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS vmb_invite_event_salon_occurred
    ON vmb_invite_event (salon_id, occurred_at DESC)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS vmb_invite_event_unique_claim_contact
    ON vmb_invite_event (
      salon_id,
      (payload->>'inviteId'),
      (payload->>'recipientContactHash')
    )
    WHERE event_type = 'invite_claimed'
      AND payload->>'inviteId' IS NOT NULL
      AND payload->>'recipientContactHash' IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS vmb_sent_invite (
    sent_invite_id text PRIMARY KEY,
    salon_id text NOT NULL,
    source_approval_id text NOT NULL,
    token_hash text NOT NULL UNIQUE,
    status text NOT NULL,
    expires_at timestamptz NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (salon_id, source_approval_id)
  )`,
  `CREATE INDEX IF NOT EXISTS vmb_sent_invite_salon_status
    ON vmb_sent_invite (salon_id, status, updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS vmb_invite_claim (
    claim_id text PRIMARY KEY,
    sent_invite_id text NOT NULL UNIQUE REFERENCES vmb_sent_invite(sent_invite_id),
    salon_id text NOT NULL,
    payload jsonb NOT NULL,
    claimed_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS vmb_invite_claim_salon_claimed
    ON vmb_invite_claim (salon_id, claimed_at DESC)`,
  `CREATE TABLE IF NOT EXISTS vmb_salon_invitation_approval (
    approval_id text PRIMARY KEY,
    salon_id text NOT NULL,
    payload jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS vmb_salon_invitation_approval_salon
    ON vmb_salon_invitation_approval (salon_id, updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS vmb_salon_calendar (
    salon_id text PRIMARY KEY,
    payload jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS vmb_salon_calendar_updated
    ON vmb_salon_calendar (updated_at DESC)`,
];

const MIGRATION_STATEMENTS: string[] = [
  `ALTER TABLE vmb_book_analysis ADD COLUMN IF NOT EXISTS salon_id text`,
  `ALTER TABLE vmb_book_analysis ADD COLUMN IF NOT EXISTS client_count integer NOT NULL DEFAULT 0`,
  `ALTER TABLE vmb_salon_workspace ADD COLUMN IF NOT EXISTS salon_id text`,
  `ALTER TABLE vmb_salon_workspace ADD COLUMN IF NOT EXISTS first_ingest_completed boolean NOT NULL DEFAULT false`,
  `ALTER TABLE vmb_salon_workspace ADD COLUMN IF NOT EXISTS latest_analysis_id text`,
];

let _ensure: Promise<boolean> | null = null;

export async function ensureVmbStorageTables(): Promise<boolean> {
  if (!vmbDatabaseUrlPresent()) return false;
  if (_ensure) return _ensure;
  _ensure = (async () => {
    try {
      await prisma.$executeRawUnsafe("SELECT 1");
      for (const ddl of DDL_STATEMENTS) {
        await prisma.$executeRawUnsafe(ddl);
      }
      for (const migration of MIGRATION_STATEMENTS) {
        await prisma.$executeRawUnsafe(migration);
      }
      return true;
    } catch {
      _ensure = null;
      return false;
    }
  })();
  return _ensure;
}

let _backend: VmbStorageBackend | null = null;

export function resetVmbStorageBackendCache(): void {
  _backend = null;
  _ensure = null;
}

export async function resolveVmbStorageBackend(): Promise<VmbStorageBackend> {
  if (_backend === "postgres") return "postgres";
  if (!vmbDatabaseUrlPresent()) {
    _backend = "json";
    return "json";
  }
  const ok = await ensureVmbStorageTables();
  _backend = ok ? "postgres" : "json";
  return _backend;
}

export { prisma };
