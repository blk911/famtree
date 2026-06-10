export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  createTrustedIntroRequest,
  listTrustedIntroRequestsForTrial,
} from "@/lib/vmb/trusted-circle/intro-store";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export async function GET(req: NextRequest) {
  const trialId = getVmbTrialIdFromRequest(req);
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No trial session", data: [] }, { status: 401 });
  }

  const requests = await listTrustedIntroRequestsForTrial(trialId);
  return NextResponse.json({ ok: true, data: requests });
}

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

    const result = await createTrustedIntroRequest({
      trialId,
      analysisId: String(body.analysisId ?? "").trim() || undefined,
      salonName: String(body.salonName ?? "").trim() || undefined,
      clientName: String(body.clientName ?? ""),
      clientEmail: String(body.clientEmail ?? "").trim() || undefined,
      clientPhone: String(body.clientPhone ?? "").trim() || undefined,
      requestedCategory: String(body.requestedCategory ?? body.providerCategory ?? ""),
      providerName: String(body.providerName ?? "").trim() || undefined,
      providerEmail: String(body.providerEmail ?? "").trim() || undefined,
      providerPhone: String(body.providerPhone ?? "").trim() || undefined,
    });

    if ("error" in result) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.request });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Intro request failed" },
      { status: 500 },
    );
  }
}
