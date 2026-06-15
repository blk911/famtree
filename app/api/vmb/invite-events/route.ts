export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isInviteEventType } from "@/lib/vmb/invites/invite-event-types";
import { listInviteEventsForSalon } from "@/lib/vmb/invites/invite-event-store";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export async function GET(req: NextRequest) {
  const trialId = getVmbTrialIdFromRequest(req);
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No trial session", data: [] }, { status: 401 });
  }

  const typesParam = req.nextUrl.searchParams.get("types")?.trim();
  const types = typesParam
    ? typesParam
        .split(",")
        .map((value) => value.trim())
        .filter(isInviteEventType)
    : undefined;

  const events = await listInviteEventsForSalon(trialId, { types });
  return NextResponse.json({ ok: true, data: events });
}
