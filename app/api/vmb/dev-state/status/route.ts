export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  assertVmbDevStateAllowed,
  getVmbDevStateStatus,
} from "@/lib/vmb/dev-state";

export async function GET() {
  const allowed = assertVmbDevStateAllowed();
  if (!allowed.ok) {
    return NextResponse.json({ ok: false, error: allowed.error }, { status: allowed.status });
  }

  const status = await getVmbDevStateStatus();
  return NextResponse.json({ ok: true, data: status });
}
