export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { listSalonInviteLocalCopies } from "@/lib/vmb/invites/salon-invite-local-copy-store";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export async function GET(req: NextRequest) {
  const salonId = getVmbTrialIdFromRequest(req);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const copies = await listSalonInviteLocalCopies(salonId);
  return NextResponse.json({ ok: true, salonId, copies });
}
