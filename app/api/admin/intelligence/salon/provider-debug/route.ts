// POST /api/admin/intelligence/salon/provider-debug

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { debugSalonProviderDiscovery } from "@/lib/intelligence/salon/salon-provider-discovery";

const BodySchema = z.object({
  instagramHandle: z.string().min(1),
  displayName: z.string().optional(),
  knownUrl: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = BodySchema.parse(await req.json());
    const debug = await debugSalonProviderDiscovery(body);
    return NextResponse.json({
      ok: true,
      directDetection: debug.directDetection,
      linkTrailDetection: debug.linkTrailDetection,
      ggHandleResolver: debug.ggHandleResolver,
      ggDisplayResolver: debug.ggDisplayResolver,
      candidates: debug.candidates,
      checkedUrls: debug.checkedUrls,
      finalProviderDecision: debug.finalProviderDecision,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "provider-debug failed", detail }, { status: 400 });
  }
}
