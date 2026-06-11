export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceForTrial } from "@/lib/vmb/workspace-store";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export async function GET(req: NextRequest) {
  const trialId = getVmbTrialIdFromRequest(req);
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No trial session", data: null }, { status: 401 });
  }

  const workspace = await getWorkspaceForTrial(trialId);
  if (!workspace || workspace.trialId !== trialId) {
    return NextResponse.json({ ok: true, data: null });
  }

  return NextResponse.json({ ok: true, data: workspace });
}
