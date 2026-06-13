export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { buildActiveBookDebugPayload } from "@/lib/vmb/active-book-debug";
import { resolveTrialIdFromRequest } from "@/lib/vmb/resolve-trial-from-request";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";
import { applyVmbTrialCookie } from "@/lib/vmb/trial-cookie-options";

export async function GET(req: NextRequest) {
  const cookieTrialId = getVmbTrialIdFromRequest(req);
  const queryId = req.nextUrl.searchParams.get("analysis")?.trim();
  const sessionId = req.nextUrl.searchParams.get("session")?.trim();
  const restoreCookie = req.nextUrl.searchParams.get("restore") === "1";

  const trialResolution = await resolveTrialIdFromRequest(req);
  const trialId = trialResolution.trialId;

  const debug = await buildActiveBookDebugPayload({
    trialId,
    hasTrialCookie: !!cookieTrialId,
    cookieTrialId,
    queryId,
    sessionId,
  });
  const { analysis, ...data } = debug;

  const res = NextResponse.json({
    ok: true,
    data: {
      ...data,
      ...(analysis ? { analysis } : {}),
    },
  });

  if (
    restoreCookie &&
    trialId &&
    !cookieTrialId &&
    (trialResolution.source === "analysis_query" || trialResolution.source === "analysis_session")
  ) {
    applyVmbTrialCookie(res, trialId);
  }

  return res;
}
