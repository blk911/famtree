import { NextRequest, NextResponse } from "next/server";
import { buildAiosContextPacket } from "@/lib/taikos/context/context-builder";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";

export async function GET(req: NextRequest) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  try {
    const ctx = await buildAiosContextPacket({
      trialId,
      pathname: req.nextUrl.searchParams.get("pathname")?.trim() || "/vmb/today",
      recordLogin: false,
    });
    if (!ctx) {
      return NextResponse.json({ ok: false, error: "Workspace not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: ctx.opportunitySummary });
  } catch (err) {
    console.error("[taikos:opportunities:GET]", err);
    return NextResponse.json({ ok: false, error: "Opportunities read failed" }, { status: 500 });
  }
}
