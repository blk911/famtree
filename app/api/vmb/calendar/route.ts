export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSalonCalendar, saveSalonCalendar } from "@/lib/vmb/calendar/salon-calendar-store";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export async function GET(request: NextRequest) {
  const salonId = getVmbTrialIdFromRequest(request);
  if (!salonId) return NextResponse.json({ ok: false, error: "Salon session required" }, { status: 401 });
  return NextResponse.json({ ok: true, calendar: await getSalonCalendar(salonId) });
}

export async function PUT(request: NextRequest) {
  const salonId = getVmbTrialIdFromRequest(request);
  if (!salonId) return NextResponse.json({ ok: false, error: "Salon session required" }, { status: 401 });

  let body: { calendar?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await saveSalonCalendar(salonId, typeof body.calendar === "object" && body.calendar ? body.calendar : {});
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
  return NextResponse.json({ ok: true, calendar: result.calendar });
}
