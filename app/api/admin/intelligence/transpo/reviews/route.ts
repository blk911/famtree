// app/api/admin/intelligence/transpo/reviews/route.ts
// GET  → all carrier reviews (newest first) + storage metadata
// POST → upsert one carrier review { carrierId, reviewStatus, reviewNotes? }
//
// Approved carriers become the qualified target queue. HTTP 200 with
// { ok:false, error } for expected validation failures; 500 only for unexpected.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  readCarrierReviews,
  upsertCarrierReview,
  getReviewStorePath,
  isReviewStatus,
  TRANSPO_REVIEW_STATUSES,
} from "@/lib/intelligence/transpo/review-store";
import { getTranspoBackendInfo } from "@/lib/intelligence/transpo/db";

function toTime(value: unknown): number {
  if (typeof value !== "string") return 0;
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

async function storageInfo() {
  const info = await getTranspoBackendInfo();
  const path = info.backend === "postgres" ? "postgres:transpo_carrier_reviews" : getReviewStorePath();
  const ephemeral = info.backend === "json" && Boolean(process.env.VERCEL);
  return { backend: info.backend, durable: info.durable, path, ephemeral };
}

export async function GET() {
  const reviews = await readCarrierReviews();
  reviews.sort((a, b) => toTime(b.updatedAt) - toTime(a.updatedAt));
  return NextResponse.json({ ok: true, reviews, storage: await storageInfo() });
}

export async function POST(req: NextRequest) {
  const storePath = getReviewStorePath();
  try {
    const body = (await req.json().catch(() => ({}))) as {
      carrierId?: string;
      reviewStatus?: string;
      reviewNotes?: string;
      reviewedBy?: string;
    };

    const carrierId = (body.carrierId ?? "").trim();
    if (!carrierId) {
      return NextResponse.json({ ok: false, error: "carrierId is required.", debug: { storePath } });
    }
    if (!isReviewStatus(body.reviewStatus)) {
      return NextResponse.json({
        ok: false,
        error: `Invalid reviewStatus. Expected one of: ${TRANSPO_REVIEW_STATUSES.join(", ")}.`,
        debug: { received: body.reviewStatus, storePath },
      });
    }

    const result = await upsertCarrierReview({
      carrierId,
      reviewStatus: body.reviewStatus,
      reviewNotes: typeof body.reviewNotes === "string" ? body.reviewNotes : undefined,
      reviewedBy: typeof body.reviewedBy === "string" ? body.reviewedBy : undefined,
    });

    if (result.persistError) {
      return NextResponse.json({
        ok: false,
        error: `Review write failed: ${result.persistError}`,
        debug: { carrierId, storePath: result.path, persistError: result.persistError },
      });
    }

    return NextResponse.json({
      ok: true,
      review: result.review,
      reviewCount: result.reviewCount,
      storage: await storageInfo(),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "review upsert failed", detail: e instanceof Error ? e.message : String(e), debug: { storePath } },
      { status: 500 },
    );
  }
}
