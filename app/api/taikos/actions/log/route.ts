import { NextRequest, NextResponse } from "next/server";
import { listActionLogForSalon } from "@/lib/taikos/actions/action-log-store";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";

export async function GET(req: NextRequest) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const limit = Number.parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10);

  try {
    const data = await listActionLogForSalon(trialId, Number.isFinite(limit) ? limit : 50);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("[taikos:actions:log]", err);
    return NextResponse.json({ ok: false, error: "Log read failed" }, { status: 500 });
  }
}
