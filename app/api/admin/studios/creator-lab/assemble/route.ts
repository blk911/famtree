// app/api/admin/studios/creator-lab/assemble/route.ts
// POST /api/admin/studios/creator-lab/assemble
// Accepts a creator URL, fetches public signals, enriches with AI, stores result.
// Internal-only — no public auth yet; protect behind admin middleware when ready.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { AssembleRequestSchema } from "@/lib/studios/creator-lab/schema";
import { fetchPublicPage }      from "@/lib/studios/creator-lab/fetch-public-page";
import { extractSignals }       from "@/lib/studios/creator-lab/extract-signals";
import { enrichCreator }        from "@/lib/studios/creator-lab/enrich-creator";
import { saveCreatorStudio }    from "@/lib/studios/creator-lab/store";
import type { AssembleResponse, AssembleErrorResponse } from "@/lib/studios/creator-lab/types";

function err(error: string, detail?: string, status = 400): NextResponse<AssembleErrorResponse> {
  return NextResponse.json({ ok: false, error, detail } as AssembleErrorResponse, { status });
}

export async function POST(req: NextRequest): Promise<NextResponse<AssembleResponse | AssembleErrorResponse>> {
  // ── Parse & validate ──────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body");
  }

  const parsed = AssembleRequestSchema.safeParse(body);
  if (!parsed.success) {
    return err("Validation error", parsed.error.errors[0]?.message);
  }

  const { url } = parsed.data;

  // ── Fetch ─────────────────────────────────────────────────────────────────────
  let source;
  try {
    source = await fetchPublicPage(url);
  } catch (fetchErr) {
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    console.error("[creator-lab/assemble] fetch error:", msg);
    return err("Failed to fetch creator page", msg, 502);
  }

  // httpStatus=0 means platform stub (e.g. Instagram — skip HTTP check)
  if (source.httpStatus >= 400) {
    return err(
      `Creator page returned HTTP ${source.httpStatus}`,
      `The page at ${url} returned an error. Try a different URL.`,
      502
    );
  }

  // Instagram stubs have htmlLength=0 by design — allow through
  if (source.htmlLength < 200 && source.platform !== "instagram") {
    return err(
      "Page returned too little content",
      "The fetched page was nearly empty — it may require login or block automated access.",
      422
    );
  }

  // ── Extract signals ───────────────────────────────────────────────────────────
  const signals = extractSignals(source);

  // ── AI enrichment ─────────────────────────────────────────────────────────────
  let studio;
  try {
    studio = await enrichCreator(source, signals);
  } catch (aiErr) {
    const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
    console.error("[creator-lab/assemble] AI enrichment error:", msg);
    return err("AI enrichment failed", msg, 500);
  }

  // ── Persist ───────────────────────────────────────────────────────────────────
  try {
    await saveCreatorStudio(studio);
  } catch (storeErr) {
    const msg = storeErr instanceof Error ? storeErr.message : String(storeErr);
    console.error("[creator-lab/assemble] store error:", msg);
    return err("Failed to save assembled studio", msg, 500);
  }

  return NextResponse.json({ ok: true, creatorId: studio.creatorId, studio } as AssembleResponse, {
    status: 201,
  });
}
