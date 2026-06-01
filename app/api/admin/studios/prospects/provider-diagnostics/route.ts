// GET /api/admin/studios/prospects/provider-diagnostics
// Aggregate booking-provider detection diagnostics across all prospects.

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listProspects } from "@/lib/studios/prospects/store";
import { enrichProspectBookingIfMissing } from "@/lib/intelligence/salon/booking-from-trail";
import { summarizeProviderDetection } from "@/lib/intelligence/salon/provider-detection-diagnostics";

export async function GET() {
  try {
    const prospects = (await listProspects()).map((p) => enrichProspectBookingIfMissing(p));
    const summary = summarizeProviderDetection(prospects);
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "Failed to load provider diagnostics", detail: msg },
      { status: 500 },
    );
  }
}
