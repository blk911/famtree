// lib/intelligence/transpo/review-store.ts
// Durable Transpo carrier-review store (human review layer). Mirrors the storage
// strategy of the other transpo stores:
//   DATABASE_URL present → Postgres (transpo_carrier_reviews)
//   otherwise            → JSON runtime store (/tmp on Vercel, runtime-data local)
//
// One review row per carrierId. Writes are best-effort and surface a persist
// error rather than throwing on a read-only filesystem.

import { promises as fs } from "fs";
import path from "path";
import type { TranspoCarrierReview, TranspoReviewStatus } from "./verification-types";
import { resolveTranspoBackend } from "./db";

const REVIEW_DIR = process.env.VERCEL
  ? path.join("/tmp", "transpo-reviews")
  : path.join(process.cwd(), "runtime-data", "intelligence", "transpo", "reviews");

const REVIEW_FILE = path.join(REVIEW_DIR, "carrier_reviews.v1.json");

export const TRANSPO_REVIEW_STATUSES: TranspoReviewStatus[] = [
  "unreviewed",
  "approved",
  "rejected",
  "needs_verification",
  "watchlist",
];

export function isReviewStatus(value: unknown): value is TranspoReviewStatus {
  return typeof value === "string" && TRANSPO_REVIEW_STATUSES.includes(value as TranspoReviewStatus);
}

export function getReviewStorePath(): string {
  return REVIEW_FILE;
}

export type UpsertReviewResult = {
  review: TranspoCarrierReview;
  reviewCount: number;
  path: string;
  persistError?: string;
};

// ── IO ───────────────────────────────────────────────────────────────────────

export async function readCarrierReviews(): Promise<TranspoCarrierReview[]> {
  if ((await resolveTranspoBackend()) === "postgres") {
    const { readReviewsPostgres } = await import("./review-postgres-store");
    return readReviewsPostgres();
  }
  try {
    const raw = await fs.readFile(REVIEW_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is TranspoCarrierReview =>
        !!r && typeof r === "object" && typeof (r as TranspoCarrierReview).carrierId === "string",
    );
  } catch {
    return [];
  }
}

export async function writeCarrierReviews(items: TranspoCarrierReview[]): Promise<string | null> {
  if ((await resolveTranspoBackend()) === "postgres") {
    const { writeReviewsPostgres } = await import("./review-postgres-store");
    return writeReviewsPostgres(items);
  }
  try {
    await fs.mkdir(REVIEW_DIR, { recursive: true });
    await fs.writeFile(REVIEW_FILE, JSON.stringify(items, null, 2), "utf8");
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export async function getCarrierReview(carrierId: string): Promise<TranspoCarrierReview | undefined> {
  const all = await readCarrierReviews();
  return all.find((r) => r.carrierId === carrierId);
}

/**
 * Upsert one carrier review. Stamps reviewedAt/updatedAt now; sets approvedAt /
 * rejectedAt when transitioning into those states (and clears the opposite).
 */
export async function upsertCarrierReview(input: {
  carrierId: string;
  reviewStatus: TranspoReviewStatus;
  reviewNotes?: string;
  reviewedBy?: string;
}): Promise<UpsertReviewResult> {
  const now = new Date().toISOString();
  const existing = await readCarrierReviews();
  const byId = new Map<string, TranspoCarrierReview>();
  for (const r of existing) byId.set(r.carrierId, r);

  const prev = byId.get(input.carrierId);
  const review: TranspoCarrierReview = {
    carrierId: input.carrierId,
    reviewStatus: input.reviewStatus,
    reviewNotes: input.reviewNotes ?? prev?.reviewNotes,
    reviewedBy: input.reviewedBy ?? prev?.reviewedBy,
    reviewedAt: now,
    approvedAt:
      input.reviewStatus === "approved" ? now : input.reviewStatus === "rejected" ? undefined : prev?.approvedAt,
    rejectedAt:
      input.reviewStatus === "rejected" ? now : input.reviewStatus === "approved" ? undefined : prev?.rejectedAt,
    updatedAt: now,
  };

  byId.set(input.carrierId, review);
  const next = Array.from(byId.values());
  const backend = await resolveTranspoBackend();
  const persistError = await writeCarrierReviews(next);

  return {
    review,
    reviewCount: next.length,
    path: backend === "postgres" ? "postgres:transpo_carrier_reviews" : REVIEW_FILE,
    ...(persistError ? { persistError } : {}),
  };
}
