// lib/intelligence/transpo/evidence-postgres-store.ts
// Postgres implementation of the Transpo Evidence Lake (table: transpo_evidence).
// De-dupe is enforced both by the deterministic id (sha1 of
// carrierKey|source|type|value) and a unique index on those four columns.
// Routed in from evidence-store.ts when DATABASE_URL is set.

import { prisma } from "./db";
import type { TranspoEvidence } from "./types";

interface DbEvidenceRow {
  id: string;
  carrier_key: string | null;
  source: string | null;
  evidence_type: string | null;
  value: string | null;
  confidence: number | string | null;
  source_url: string | null;
  observed_at: Date | string | null;
}

function toIso(v: Date | string | null): string {
  if (!v) return new Date().toISOString();
  return v instanceof Date ? v.toISOString() : v;
}

function rowToEvidence(row: DbEvidenceRow): TranspoEvidence {
  return {
    id: row.id,
    carrierKey: row.carrier_key ?? "",
    source: (row.source ?? "fmcsa") as TranspoEvidence["source"],
    evidenceType: (row.evidence_type ?? "unknown") as TranspoEvidence["evidenceType"],
    value: row.value ?? "",
    confidence: row.confidence === null || row.confidence === undefined ? 0 : Number(row.confidence),
    ...(row.source_url ? { sourceUrl: row.source_url } : {}),
    observedAt: toIso(row.observed_at),
  };
}

export async function readEvidencePostgres(): Promise<TranspoEvidence[]> {
  try {
    const rows = await prisma.$queryRaw<DbEvidenceRow[]>`
      SELECT * FROM transpo_evidence ORDER BY observed_at DESC
    `;
    return rows.map(rowToEvidence);
  } catch {
    return [];
  }
}

export type AppendEvidencePgResult = {
  created: number;
  skipped: number;
  evidenceCount: number;
  persistError?: string;
};

/**
 * Insert evidence items, skipping any that already exist (by id PK). Returns
 * created/skipped counts and the resulting total.
 */
export async function appendEvidencePostgres(
  items: TranspoEvidence[],
): Promise<AppendEvidencePgResult> {
  try {
    let created = 0;
    let skipped = 0;
    for (const e of items) {
      const res = await prisma.$executeRaw`
        INSERT INTO transpo_evidence (
          id, carrier_key, source, evidence_type, value, confidence, source_url, observed_at
        ) VALUES (
          ${e.id},
          ${e.carrierKey},
          ${e.source},
          ${e.evidenceType},
          ${e.value},
          ${e.confidence ?? 0},
          ${e.sourceUrl ?? null},
          ${e.observedAt ? new Date(e.observedAt) : new Date()}
        )
        ON CONFLICT DO NOTHING
      `;
      if (res > 0) created++;
      else skipped++;
    }
    const evidenceCount = await countEvidencePostgres();
    return { created, skipped, evidenceCount };
  } catch (e) {
    const evidenceCount = await countEvidencePostgres();
    return {
      created: 0,
      skipped: items.length,
      evidenceCount,
      persistError: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function countEvidencePostgres(): Promise<number> {
  try {
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM transpo_evidence
    `;
    return Number(result[0]?.count ?? 0);
  } catch {
    return 0;
  }
}
