import { NextRequest, NextResponse } from "next/server";
import { listActivities } from "@/lib/taikos/activity/activity-store";
import { summarizeActivities } from "@/lib/taikos/activity/activity-summary";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";

export async function GET(req: NextRequest) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  try {
    const events = await listActivities(trialId);
    return NextResponse.json({ ok: true, data: summarizeActivities(events, 40) });
  } catch (err) {
    console.error("[taikos:activity:GET]", err);
    return NextResponse.json({ ok: false, error: "Activity read failed" }, { status: 500 });
  }
}
