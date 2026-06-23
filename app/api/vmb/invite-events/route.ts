export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isInviteEventType } from "@/lib/vmb/invites/invite-event-types";
import { appendInviteEvent } from "@/lib/vmb/invites/append-invite-event";
import { listInviteEventsForSalon } from "@/lib/vmb/invites/invite-event-store";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

// Analytics-only event log. Send/claim/redemption money state must use /api/vmb/sent-invites.
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

export async function POST(req: NextRequest) {
  const trialId = getVmbTrialIdFromRequest(req);
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No trial session" }, { status: 401 });
  }

  let body: { eventType?: string; payload?: Record<string, unknown> };
  try {
    body = (await req.json()) as { eventType?: string; payload?: Record<string, unknown> };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isInviteEventType(body.eventType)) {
    return NextResponse.json({ ok: false, error: "Invalid event type" }, { status: 400 });
  }

  const payload = Object.fromEntries(
    Object.entries(body.payload ?? {}).filter(([, value]) => typeof value === "string"),
  );
  const result = await appendInviteEvent({
    salonId: trialId,
    eventType: body.eventType,
    payload,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, eventId: result.event.eventId, event: result.event });
}
