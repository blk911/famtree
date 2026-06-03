// POST /api/admin/intelligence/salon/provider-provenance/backfill

export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runProviderProvenanceBackfill } from "@/lib/intelligence/salon/provider-provenance/provenance-engine";

const BodySchema = z.object({
  limit: z.number().int().min(1).max(500).optional().default(500),
  persist: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const body = BodySchema.parse(await req.json().catch(() => ({})));
    const result = await runProviderProvenanceBackfill({
      limit: body.limit,
      persist: body.persist,
    });
    return NextResponse.json(result);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "provider_provenance_backfill_failed", detail },
      { status: 500 },
    );
  }
}
