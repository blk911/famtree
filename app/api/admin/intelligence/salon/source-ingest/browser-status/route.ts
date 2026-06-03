// GET /api/admin/intelligence/salon/source-ingest/browser-status

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getPlaywrightRuntimeStatus } from "@/lib/intelligence/salon/source-ingest/playwright-runtime";

export async function GET() {
  try {
    const status = await getPlaywrightRuntimeStatus(true);
    return NextResponse.json({
      ok: true,
      browserAvailable: status.browserAvailable,
      packageInstalled: status.packageInstalled,
    });
  } catch {
    return NextResponse.json({
      ok: true,
      browserAvailable: false,
      packageInstalled: false,
    });
  }
}
