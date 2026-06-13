export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { resolveActiveBook } from "@/lib/vmb/active-book-resolver";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export async function GET(req: NextRequest) {
  const trialId = getVmbTrialIdFromRequest(req);
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No trial session", data: null }, { status: 401 });
  }

  const queryId = req.nextUrl.searchParams.get("analysis")?.trim();
  const sessionId = req.nextUrl.searchParams.get("session")?.trim();
  const resolved = await resolveActiveBook(trialId, { queryId, sessionId });

  return NextResponse.json({
    ok: true,
    data: {
      hasActiveBook: resolved.hasActiveBook,
      analysisId: resolved.analysisId,
      clientCount: resolved.clientCount,
      recordCount: resolved.recordCount,
      updatedAt: resolved.updatedAt,
      source: resolved.source,
      analysis: resolved.analysis,
    },
  });
}
