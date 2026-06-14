export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";
import { applyVmbTrialCookie } from "@/lib/vmb/trial-cookie-options";
import { resolveVmbMvpLogin } from "@/lib/vmb/vmb-mvp-login";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "");
    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Email and password are required" }, { status: 400 });
    }

    const outcome = await resolveVmbMvpLogin({
      email,
      password,
      existingTrialId: getVmbTrialIdFromRequest(req),
    });
    if (!outcome.ok) {
      return NextResponse.json({ ok: false, error: outcome.error }, { status: 401 });
    }

    const res = NextResponse.json({
      ok: true,
      data: {
        redirectTo: outcome.redirectTo,
        trialId: outcome.trialId,
        hasActiveBook: outcome.hasActiveBook,
        analysisId: outcome.analysisId,
        createdTrial: outcome.createdTrial,
      },
    });
    applyVmbTrialCookie(res, outcome.trialId);
    return res;
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Login failed" },
      { status: 500 },
    );
  }
}
