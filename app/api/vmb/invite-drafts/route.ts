export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { listInviteDraftsForTrialAnalysis } from "@/lib/vmb/invite-drafts/invite-draft-store";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export async function GET(req: NextRequest) {
  const trialId = getVmbTrialIdFromRequest(req);
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No trial session", data: [] }, { status: 401 });
  }

  const analysisId = req.nextUrl.searchParams.get("analysisId")?.trim();
  if (!analysisId) {
    return NextResponse.json({ ok: false, error: "analysisId is required" }, { status: 400 });
  }

  const drafts = await listInviteDraftsForTrialAnalysis(trialId, analysisId);
  return NextResponse.json({ ok: true, data: drafts });
}
