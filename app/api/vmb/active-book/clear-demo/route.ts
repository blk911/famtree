export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { clearAdminDemoBookBindingForSalon } from "@/lib/vmb/admin-demo-book";
import {
  isVmbDevOperatorApiEnabled,
  vmbDevOperatorApiDisabledResponse,
} from "@/lib/vmb/dev-operator-api-guard";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export async function POST(req: NextRequest) {
  if (!isVmbDevOperatorApiEnabled()) {
    return NextResponse.json(vmbDevOperatorApiDisabledResponse(), { status: 404 });
  }

  const salonId = getVmbTrialIdFromRequest(req);
  if (!salonId) {
    return NextResponse.json(
      { ok: false, error: "No salon session — open the salon app first." },
      { status: 401 },
    );
  }

  const outcome = await clearAdminDemoBookBindingForSalon(salonId);
  if (!outcome.ok) {
    return NextResponse.json({ ok: false, error: outcome.error }, { status: outcome.status });
  }

  return NextResponse.json({ ok: true, data: { salonId } });
}
