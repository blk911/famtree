// GET /api/admin/intelligence/salon/storage/status

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSalonStorageStatus } from "@/lib/intelligence/salon/storage-status";

export async function GET() {
  try {
    const status = await getSalonStorageStatus();
    return NextResponse.json(status);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "storage status failed", detail },
      { status: 500 },
    );
  }
}
