// POST /api/admin/intelligence/salon/gg-resolver/test

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  debugGlossGeniusResolver,
  collectGlossGeniusCandidates,
} from "@/lib/intelligence/salon/glossgenius-handle-resolver";

const BodySchema = z.object({
  handle: z.string().min(1),
  displayName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = BodySchema.parse(await req.json());
    const handle = body.handle.replace(/^@+/, "").trim();
    const candidates = collectGlossGeniusCandidates({
      instagramHandle: handle,
      displayName: body.displayName,
    });
    const result = await debugGlossGeniusResolver({
      instagramHandle: handle,
      displayName: body.displayName,
    });

    return NextResponse.json({
      ok: true,
      result: {
        found: result.found,
        provider: result.provider,
        bookingUrl: result.bookingUrl,
        confidence: result.confidence,
        source: result.source,
        reason: result.reason,
      },
      candidates: candidates.map((c) => ({
        url: c.url,
        slug: c.slug,
        source: c.source,
      })),
      checkedUrls: result.checkedUrls ?? candidates.map((c) => c.url),
      statusCodes: result.statusCodes ?? result.probeLog?.map((p) => p.httpStatus) ?? [],
      markersFound: result.markersFound ?? [],
      probeLog: result.probeLog,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "test failed", detail }, { status: 400 });
  }
}
