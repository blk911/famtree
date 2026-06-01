// lib/intelligence/salon/public-presence/db.ts

import { prisma } from "@/lib/db/prisma";

export type SalonPresenceBackend = "postgres" | "json";

export function databaseUrlPresent(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

const DDL = `CREATE TABLE IF NOT EXISTS salon_public_presence_results (
  id text PRIMARY KEY,
  prospect_id text,
  source text,
  url text,
  title text,
  snippet text,
  url_type text,
  provider text,
  provider_label text,
  confidence numeric,
  evidence jsonb,
  discovered_at timestamptz DEFAULT now(),
  UNIQUE (prospect_id, url)
)`;

let _ensure: Promise<boolean> | null = null;

export async function ensureSalonPresenceTables(): Promise<boolean> {
  if (!databaseUrlPresent()) return false;
  if (_ensure) return _ensure;
  _ensure = (async () => {
    try {
      await prisma.$executeRawUnsafe("SELECT 1");
      await prisma.$executeRawUnsafe(DDL);
      return true;
    } catch {
      _ensure = null;
      return false;
    }
  })();
  return _ensure;
}

let _backend: SalonPresenceBackend | null = null;

export async function resolveSalonPresenceBackend(): Promise<SalonPresenceBackend> {
  if (_backend === "postgres") return "postgres";
  if (!databaseUrlPresent()) {
    _backend = "json";
    return "json";
  }
  const ok = await ensureSalonPresenceTables();
  _backend = ok ? "postgres" : "json";
  return _backend;
}

export { prisma };
