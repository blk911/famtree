// GET /api/admin/intelligence/salon/harvest-analytics

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { buildHarvestAnalytics } from "@/lib/intelligence/salon/harvest-analytics";

export async function GET() {
  try {
    const data = await buildHarvestAnalytics();
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "harvest analytics failed", detail },
      { status: 500 },
    );
  }
}
