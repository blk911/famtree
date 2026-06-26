export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getBookableSlots, getSalonCalendar } from "@/lib/vmb/calendar/salon-calendar-store";
import { resolveRecipientInvite } from "@/lib/vmb/invites/resolve-recipient-invite";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const sentInviteId = request.nextUrl.searchParams.get("sentInviteId") ?? "";
  const resolved = token ? await resolveRecipientInvite(token) : null;
  if (!resolved?.sentInvite) {
    return NextResponse.json(
      { ok: false, error: sentInviteId ? "Token required for booking slots." : "Invite not found." },
      { status: sentInviteId ? 400 : 404 },
    );
  }
  if (resolved.status !== "available") {
    return NextResponse.json({ ok: false, error: resolved.status === "expired" ? resolved.message : "Invite unavailable." }, { status: 410 });
  }

  const calendar = await getSalonCalendar(resolved.sentInvite.salonId);
  return NextResponse.json({
    ok: true,
    slots: getBookableSlots(calendar, { limit: 36 }),
    calendarVersion: calendar.version,
  });
}
