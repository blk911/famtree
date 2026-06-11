export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ensureInviteDraftsForAnalysis } from "@/lib/vmb/invite-drafts/invite-draft-store";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export async function POST(req: NextRequest) {
  try {
    const trialId = getVmbTrialIdFromRequest(req);
    if (!trialId) {
      return NextResponse.json({ ok: false, error: "Trial session required" }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const bodyTrialId = String(body.trialId ?? "").trim();
    if (bodyTrialId && bodyTrialId !== trialId) {
      return NextResponse.json(
        { ok: false, error: "trialId does not match current trial session" },
        { status: 403 },
      );
    }

    const analysisId = String(body.analysisId ?? "").trim();
    if (!analysisId) {
      return NextResponse.json({ ok: false, error: "analysisId is required" }, { status: 400 });
    }

    const result = await ensureInviteDraftsForAnalysis(trialId, analysisId);
    if ("error" in result) {
      const status = result.error.includes("not available") ? 403 : 500;
      return NextResponse.json({ ok: false, error: result.error }, { status });
    }

    return NextResponse.json({ ok: true, data: result.drafts });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Build failed" },
      { status: 500 },
    );
  }
}
