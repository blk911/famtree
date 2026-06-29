export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { submitInviteClaim } from "@/lib/vmb/invites/submit-invite-claim";
import type { ClientInviteBookingRequest } from "@/lib/vmb/invites/sent-invite-types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      inviteId?: string;
      name?: string;
      contact?: string;
      action?: string;
      note?: string;
      requestedSlot?: string;
      booking?: ClientInviteBookingRequest;
    };

    const result = await submitInviteClaim({
      inviteId: String(body.inviteId ?? ""),
      name: body.name !== undefined ? String(body.name) : undefined,
      contact: String(body.contact ?? ""),
      action: body.action !== undefined ? String(body.action) : undefined,
      note: body.note !== undefined ? String(body.note) : undefined,
      requestedSlot: body.requestedSlot !== undefined ? String(body.requestedSlot) : undefined,
      booking: body.booking,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      alreadyClaimed: result.alreadyClaimed,
      intent: result.intent,
      message: "You're on the list — the salon can follow up with next steps.",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Claim failed" }, { status: 500 });
  }
}
