export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { buildVmbFullFlowDebug } from "@/lib/vmb/debug-full-flow";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available in production" }, { status: 404 });
  }

  const trialId = getVmbTrialIdFromRequest(req);
  const analysisId = req.nextUrl.searchParams.get("analysis")?.trim();
  const pageContext = await loadVmbPageContext({ analysisId });
  const debug = await buildVmbFullFlowDebug(trialId, pageContext);

  return NextResponse.json({ ok: true, data: debug });
}
