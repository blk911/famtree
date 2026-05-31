// lib/intelligence/transpo/carrier-master-postgres-store.ts
// Postgres implementation of the Transpo carrier master (table:
// transpo_carrier_master). The merge/identity logic stays in
// carrier-master-store.ts (read → merge in memory → write); this module only
// provides durable read/write. writeCarrierMasterPostgres upserts each row by id
// (identity is keyed by carrierIdentityKey in code), which is growth-safe since
// these flows never delete carriers.

import { prisma } from "./db";
import type { TranspoCarrierTarget, TranspoSource } from "./types";

interface DbCarrierRow {
  id: string;
  company_name: string | null;
  dot_number: string | null;
  mc_number: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  website: string | null;
  fleet_size: number | null;
  driver_count: number | null;
  authority_status: string | null;
  sources: unknown;
  evidence_ids: unknown;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}

function parseJson<T>(col: unknown, fallback: T): T {
  if (col === null || col === undefined) return fallback;
  if (typeof col === "string") {
    try {
      return JSON.parse(col) as T;
    } catch {
      return fallback;
    }
  }
  return col as T;
}

function toIso(v: Date | string | null): string {
  if (!v) return new Date().toISOString();
  return v instanceof Date ? v.toISOString() : v;
}

function rowToTarget(row: DbCarrierRow): TranspoCarrierTarget {
  return {
    id: row.id,
    companyName: row.company_name ?? "(unnamed carrier)",
    dotNumber: row.dot_number ?? undefined,
    mcNumber: row.mc_number ?? undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    phone: row.phone ?? undefined,
    website: row.website ?? undefined,
    fleetSize: row.fleet_size ?? undefined,
    driverCount: row.driver_count ?? undefined,
    authorityStatus: row.authority_status ?? undefined,
    sources: parseJson<TranspoSource[]>(row.sources, []),
    evidenceIds: parseJson<string[]>(row.evidence_ids, []),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export async function readCarrierMasterPostgres(): Promise<TranspoCarrierTarget[]> {
  try {
    const rows = await prisma.$queryRaw<DbCarrierRow[]>`
      SELECT * FROM transpo_carrier_master ORDER BY updated_at DESC
    `;
    return rows.map(rowToTarget);
  } catch {
    return [];
  }
}

/** Upsert the full carrier set by id. Returns null on success or an error. */
export async function writeCarrierMasterPostgres(
  carriers: TranspoCarrierTarget[],
): Promise<string | null> {
  try {
    for (const c of carriers) {
      await prisma.$executeRaw`
        INSERT INTO transpo_carrier_master (
          id, company_name, dot_number, mc_number, city, state, phone, website,
          fleet_size, driver_count, authority_status, sources, evidence_ids,
          created_at, updated_at
        ) VALUES (
          ${c.id},
          ${c.companyName},
          ${c.dotNumber ?? null},
          ${c.mcNumber ?? null},
          ${c.city ?? null},
          ${c.state ?? null},
          ${c.phone ?? null},
          ${c.website ?? null},
          ${c.fleetSize ?? null},
          ${c.driverCount ?? null},
          ${c.authorityStatus ?? null},
          ${JSON.stringify(c.sources ?? [])}::jsonb,
          ${JSON.stringify(c.evidenceIds ?? [])}::jsonb,
          ${c.createdAt ? new Date(c.createdAt) : new Date()},
          ${c.updatedAt ? new Date(c.updatedAt) : new Date()}
        )
        ON CONFLICT (id) DO UPDATE SET
          company_name     = EXCLUDED.company_name,
          dot_number       = EXCLUDED.dot_number,
          mc_number        = EXCLUDED.mc_number,
          city             = EXCLUDED.city,
          state            = EXCLUDED.state,
          phone            = EXCLUDED.phone,
          website          = EXCLUDED.website,
          fleet_size       = EXCLUDED.fleet_size,
          driver_count     = EXCLUDED.driver_count,
          authority_status = EXCLUDED.authority_status,
          sources          = EXCLUDED.sources,
          evidence_ids     = EXCLUDED.evidence_ids,
          updated_at       = EXCLUDED.updated_at
      `;
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export async function countCarrierMasterPostgres(): Promise<number> {
  try {
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM transpo_carrier_master
    `;
    return Number(result[0]?.count ?? 0);
  } catch {
    return 0;
  }
}
