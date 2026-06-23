export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { listSalonInviteLocalCopies } from "@/lib/vmb/invites/salon-invite-local-copy-store";
import { verifyVmbSalonSession } from "@/lib/vmb/salon-authority";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

function resolveSalonId(req: NextRequest): string | undefined {
  const salonToken = req.nextUrl.searchParams.get("salonToken")?.trim();
  if (salonToken) return verifyVmbSalonSession(salonToken);
  return getVmbTrialIdFromRequest(req);
}

export async function GET(req: NextRequest) {
  const salonId = resolveSalonId(req);
  if (!salonId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const copies = await listSalonInviteLocalCopies(salonId);
  return NextResponse.json({ ok: true, salonId, copies });
}
