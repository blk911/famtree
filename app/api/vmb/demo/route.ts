export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { bootstrapVmbDemoSession } from "@/lib/vmb/bootstrap-vmb-demo";
import { applyVmbTrialCookie } from "@/lib/vmb/trial-cookie-options";

export async function POST() {
  try {
    const outcome = await bootstrapVmbDemoSession();
    if (!outcome.ok) {
      return NextResponse.json({ ok: false, error: outcome.error }, { status: 500 });
    }

    const res = NextResponse.json({
      ok: true,
      data: {
        trialId: outcome.trialId,
        analysisId: outcome.analysisId,
        clientCount: outcome.clientCount,
        seedPath: outcome.seedPath,
        redirectTo: outcome.redirectTo,
      },
    });
    applyVmbTrialCookie(res, outcome.trialId);
    return res;
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Demo bootstrap failed" },
      { status: 500 },
    );
  }
}
