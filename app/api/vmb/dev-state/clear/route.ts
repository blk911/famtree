export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  assertVmbDevStateAllowed,
  clearVmbDevState,
} from "@/lib/vmb/dev-state";

export async function POST() {
  const allowed = assertVmbDevStateAllowed();
  if (!allowed.ok) {
    return NextResponse.json({ ok: false, error: allowed.error }, { status: allowed.status });
  }

  await clearVmbDevState();
  return NextResponse.json({ ok: true });
}
