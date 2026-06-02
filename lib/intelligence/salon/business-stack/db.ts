// lib/intelligence/salon/business-stack/db.ts

import { prisma } from "@/lib/db/prisma";

export type SalonStackBackend = "postgres" | "json";

export function databaseUrlPresent(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

const DDL = `CREATE TABLE IF NOT EXISTS salon_business_stack (
  prospect_id text PRIMARY KEY,
  instagram_handle text,
  signals jsonb DEFAULT '[]'::jsonb,
  primary_booking_provider text,
  primary_payment_provider text,
  website_builder text,
  review_presence jsonb DEFAULT '[]'::jsonb,
  marketing_pixels jsonb DEFAULT '[]'::jsonb,
  check_in_provider text,
  stack_completeness_score integer DEFAULT 0,
  operational_maturity text DEFAULT 'low',
  import_opportunity boolean DEFAULT false,
  notes jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
)`;

let _ensure: Promise<boolean> | null = null;

export async function ensureSalonBusinessStackTables(): Promise<boolean> {
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

let _backend: SalonStackBackend | null = null;

export async function resolveSalonStackBackend(): Promise<SalonStackBackend> {
  if (_backend === "postgres") return "postgres";
  if (!databaseUrlPresent()) {
    _backend = "json";
    return "json";
  }
  const ok = await ensureSalonBusinessStackTables();
  _backend = ok ? "postgres" : "json";
  return _backend;
}

export { prisma };
