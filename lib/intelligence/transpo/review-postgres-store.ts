// lib/intelligence/transpo/review-postgres-store.ts
// Postgres implementation of the Transpo carrier review store (table:
// transpo_carrier_reviews). Upserts by carrier_id (primary key). Routed in from
// review-store.ts when DATABASE_URL is set.

import { prisma } from "./db";
import type { TranspoCarrierReview, TranspoReviewStatus } from "./verification-types";

interface DbReviewRow {
  carrier_id: string;
  review_status: string | null;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | string | null;
  approved_at: Date | string | null;
  rejected_at: Date | string | null;
  updated_at: Date | string | null;
}

function toIso(v: Date | string | null): string | undefined {
  if (!v) return undefined;
  return v instanceof Date ? v.toISOString() : v;
}

function rowToReview(row: DbReviewRow): TranspoCarrierReview {
  return {
    carrierId: row.carrier_id,
    reviewStatus: (row.review_status ?? "unreviewed") as TranspoReviewStatus,
    reviewNotes: row.review_notes ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: toIso(row.reviewed_at),
    approvedAt: toIso(row.approved_at),
    rejectedAt: toIso(row.rejected_at),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}

export async function readReviewsPostgres(): Promise<TranspoCarrierReview[]> {
  try {
    const rows = await prisma.$queryRaw<DbReviewRow[]>`
      SELECT * FROM transpo_carrier_reviews ORDER BY updated_at DESC
    `;
    return rows.map(rowToReview);
  } catch {
    return [];
  }
}

/** Upsert review rows by carrier_id. Returns null on success or an error. */
export async function writeReviewsPostgres(items: TranspoCarrierReview[]): Promise<string | null> {
  try {
    for (const r of items) {
      await prisma.$executeRaw`
        INSERT INTO transpo_carrier_reviews (
          carrier_id, review_status, review_notes, reviewed_by,
          reviewed_at, approved_at, rejected_at, updated_at
        ) VALUES (
          ${r.carrierId},
          ${r.reviewStatus},
          ${r.reviewNotes ?? null},
          ${r.reviewedBy ?? null},
          ${r.reviewedAt ? new Date(r.reviewedAt) : null},
          ${r.approvedAt ? new Date(r.approvedAt) : null},
          ${r.rejectedAt ? new Date(r.rejectedAt) : null},
          ${r.updatedAt ? new Date(r.updatedAt) : new Date()}
        )
        ON CONFLICT (carrier_id) DO UPDATE SET
          review_status = EXCLUDED.review_status,
          review_notes  = EXCLUDED.review_notes,
          reviewed_by   = EXCLUDED.reviewed_by,
          reviewed_at   = EXCLUDED.reviewed_at,
          approved_at   = EXCLUDED.approved_at,
          rejected_at   = EXCLUDED.rejected_at,
          updated_at    = EXCLUDED.updated_at
      `;
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
