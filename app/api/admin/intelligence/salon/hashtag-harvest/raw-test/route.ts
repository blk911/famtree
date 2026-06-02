// app/api/admin/intelligence/salon/hashtag-harvest/raw-test/route.ts
// POST /api/admin/intelligence/salon/hashtag-harvest/raw-test
//
// Minimal raw Apify probe — no resolver, no DB writes.
// Use to verify actor input shape and dataset read before running a full harvest.
//
// Body: { hashtag: string, limit?: number, variant?: "primary"|"maxPosts"|"hash-prefix"|"search" }
// Returns: { ok, actorId, actorInput, runId, status, datasetId, datasetItemCount, sample, rawKeysSample, error }

export const dynamic = "force-dynamic";
export const maxDuration = 90;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runApifyRawTest } from "@/lib/studios/creator-lab/hashtag-harvest/apify-client";

const BodySchema = z.object({
  hashtag: z.string().min(1).max(100),
  limit:   z.number().int().min(1).max(50).default(5),
  variant: z.enum(["primary", "maxPosts", "hash-prefix", "search"]).default("primary"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 }); }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validation error", detail: parsed.error.errors[0]?.message },
      { status: 400 },
    );
  }

  const { hashtag, limit, variant } = parsed.data;

  console.log(`[raw-test] hashtag=${hashtag} limit=${limit} variant=${variant}`);

  const result = await runApifyRawTest(hashtag, limit, variant);

  console.log(`[raw-test] ok=${result.ok} items=${result.datasetItemCount} status=${result.status}`);

  return NextResponse.json(result, { status: result.ok || result.datasetItemCount > 0 ? 200 : 200 });
}
