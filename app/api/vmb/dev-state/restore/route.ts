export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  assertVmbDevStateAllowed,
  restoreVmbDevState,
} from "@/lib/vmb/dev-state";
import { applyVmbTrialCookie } from "@/lib/vmb/trial-cookie-options";

export async function POST() {
  const allowed = assertVmbDevStateAllowed();
  if (!allowed.ok) {
    return NextResponse.json({ ok: false, error: allowed.error }, { status: allowed.status });
  }

  const outcome = await restoreVmbDevState();
  if (!outcome.ok) {
    return NextResponse.json({ ok: false, error: outcome.error }, { status: outcome.status });
  }

  const res = NextResponse.json({
    ok: true,
    data: {
      salonId: outcome.salonId,
      analysisId: outcome.analysisId,
      redirectUrl: outcome.redirectUrl,
      snapshot: outcome.snapshot,
    },
  });
  applyVmbTrialCookie(res, outcome.salonId);
  return res;
}
