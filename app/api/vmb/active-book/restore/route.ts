export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { restoreActiveBookForSalon } from "@/lib/vmb/active-book-restore";
import {
  isVmbDevOperatorApiEnabled,
  vmbDevOperatorApiDisabledResponse,
} from "@/lib/vmb/dev-operator-api-guard";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";
import { applyVmbTrialCookie } from "@/lib/vmb/trial-cookie-options";

export async function POST(req: NextRequest) {
  if (!isVmbDevOperatorApiEnabled()) {
    return NextResponse.json(vmbDevOperatorApiDisabledResponse(), { status: 404 });
  }

  const salonId = getVmbTrialIdFromRequest(req);
  if (!salonId) {
    return NextResponse.json(
      { ok: false, error: "No salon session — open the salon app first or load your book once." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const analysisId = String(body.analysisId ?? "").trim();
  if (!analysisId) {
    return NextResponse.json({ ok: false, error: "analysisId is required" }, { status: 400 });
  }

  const outcome = await restoreActiveBookForSalon(salonId, analysisId);
  if (!outcome.ok) {
    return NextResponse.json({ ok: false, error: outcome.error }, { status: outcome.status });
  }

  const res = NextResponse.json({
    ok: true,
    data: {
      analysisId: outcome.analysisId,
      salonId: outcome.salonId,
    },
  });
  applyVmbTrialCookie(res, outcome.salonId);
  return res;
}
