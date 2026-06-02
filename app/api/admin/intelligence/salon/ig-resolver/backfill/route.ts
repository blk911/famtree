// POST /api/admin/intelligence/salon/ig-resolver/backfill

export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runSalonIgResolverUrlBackfill } from "@/lib/intelligence/salon/ig-resolver-backfill";

const BodySchema = z.object({
  limit: z.number().int().min(1).max(250).optional().default(50),
  onlyMissingUrls: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const body = BodySchema.parse(await req.json());
    const summary = await runSalonIgResolverUrlBackfill(body);
    return NextResponse.json(summary);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        error: "ig_resolver_backfill_failed",
        detail,
        checked: 0,
        updated: 0,
        skippedNoHandle: 0,
        urlsFound: 0,
        providersFound: 0,
        websiteFound: 0,
        squareFound: 0,
        glossGeniusFound: 0,
        vagaroFound: 0,
        failed: 0,
        results: [],
      },
      { status: 500 },
    );
  }
}
