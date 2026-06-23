export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { syncLibraryTemplatesToSalon } from "@/lib/vmb/invites/salon-invite-local-copy-store";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export async function POST(req: NextRequest) {
  const salonId = getVmbTrialIdFromRequest(req);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const result = await syncLibraryTemplatesToSalon(salonId);
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    salonId,
    copies: result.copies,
    createdCount: result.createdCount,
  });
}
