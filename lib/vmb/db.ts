import { prisma } from "@/lib/db/prisma";

export type VmbStorageBackend = "postgres" | "json";

export function vmbDatabaseUrlPresent(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

const DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS vmb_book_analysis (
    analysis_id text PRIMARY KEY,
    trial_id text,
    record_count integer NOT NULL DEFAULT 0,
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
    payload jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
  )`,
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
      return true;
    } catch {
      _ensure = null;
      return false;
    }
  })();
  return _ensure;
}

let _backend: VmbStorageBackend | null = null;

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
