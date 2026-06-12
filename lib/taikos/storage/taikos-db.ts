import { prisma, vmbDatabaseUrlPresent } from "@/lib/vmb/db";

export type TaikosStorageBackend = "postgres" | "json";

const DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS taikos_queue_item (
    id text PRIMARY KEY,
    salon_id text NOT NULL,
    workspace_id text,
    analysis_id text,
    type text NOT NULL,
    status text NOT NULL,
    title text,
    summary text,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS taikos_queue_item_salon_id ON taikos_queue_item (salon_id)`,
  `CREATE INDEX IF NOT EXISTS taikos_queue_item_analysis_id ON taikos_queue_item (analysis_id)`,
  `CREATE INDEX IF NOT EXISTS taikos_queue_item_status ON taikos_queue_item (status)`,
  `CREATE INDEX IF NOT EXISTS taikos_queue_item_updated_at ON taikos_queue_item (updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS taikos_draft (
    id text PRIMARY KEY,
    salon_id text NOT NULL,
    workspace text,
    type text NOT NULL,
    status text NOT NULL,
    title text,
    body text,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS taikos_draft_salon_id ON taikos_draft (salon_id)`,
  `CREATE INDEX IF NOT EXISTS taikos_draft_workspace ON taikos_draft (workspace)`,
  `CREATE INDEX IF NOT EXISTS taikos_draft_type ON taikos_draft (type)`,
  `CREATE INDEX IF NOT EXISTS taikos_draft_status ON taikos_draft (status)`,
  `CREATE INDEX IF NOT EXISTS taikos_draft_updated_at ON taikos_draft (updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS taikos_goal (
    id text PRIMARY KEY,
    salon_id text NOT NULL,
    status text NOT NULL,
    title text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS taikos_goal_salon_id ON taikos_goal (salon_id)`,
  `CREATE INDEX IF NOT EXISTS taikos_goal_status ON taikos_goal (status)`,
  `CREATE INDEX IF NOT EXISTS taikos_goal_updated_at ON taikos_goal (updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS taikos_activity (
    id text PRIMARY KEY,
    salon_id text NOT NULL,
    type text NOT NULL,
    title text,
    summary text,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS taikos_activity_salon_id ON taikos_activity (salon_id)`,
  `CREATE INDEX IF NOT EXISTS taikos_activity_type ON taikos_activity (type)`,
  `CREATE INDEX IF NOT EXISTS taikos_activity_created_at ON taikos_activity (created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS taikos_session (
    id text PRIMARY KEY,
    salon_id text NOT NULL,
    status text,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS taikos_session_salon_id ON taikos_session (salon_id)`,
  `CREATE INDEX IF NOT EXISTS taikos_session_updated_at ON taikos_session (updated_at DESC)`,
];

let _ensure: Promise<boolean> | null = null;

export function taikosDatabaseUrlPresent(): boolean {
  return vmbDatabaseUrlPresent();
}

export async function ensureTaikosStorageTables(): Promise<boolean> {
  if (!taikosDatabaseUrlPresent()) return false;
  if (_ensure) return _ensure;
  _ensure = (async () => {
    try {
      await prisma.$executeRawUnsafe("SELECT 1");
      for (const ddl of DDL_STATEMENTS) {
        await prisma.$executeRawUnsafe(ddl);
      }
      return true;
    } catch {
      _ensure = null;
      return false;
    }
  })();
  return _ensure;
}

let _backend: TaikosStorageBackend | null = null;

export function resetTaikosStorageBackendCache(): void {
  _backend = null;
  _ensure = null;
}

export async function resolveTaikosStorageBackend(): Promise<TaikosStorageBackend> {
  if (_backend === "postgres") return "postgres";
  if (!taikosDatabaseUrlPresent()) {
    _backend = "json";
    return "json";
  }
  const ok = await ensureTaikosStorageTables();
  _backend = ok ? "postgres" : "json";
  return _backend;
}

export { prisma };

export function parsePayload<T>(raw: unknown, isValid: (item: unknown) => item is T): T | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    try {
      return parsePayload(JSON.parse(raw) as unknown, isValid);
    } catch {
      return undefined;
    }
  }
  return isValid(raw) ? raw : undefined;
}
