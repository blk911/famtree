export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  assertVmbDevStateAllowed,
  captureVmbDevState,
} from "@/lib/vmb/dev-state";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export async function POST(req: NextRequest) {
  const allowed = assertVmbDevStateAllowed();
  if (!allowed.ok) {
    return NextResponse.json({ ok: false, error: allowed.error }, { status: allowed.status });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const selected = body.selected && typeof body.selected === "object" ? body.selected as Record<string, unknown> : undefined;
  const snapshot = await captureVmbDevState({
    salonId: String(body.salonId ?? getVmbTrialIdFromRequest(req) ?? "").trim() || undefined,
    latestAnalysisId: String(body.latestAnalysisId ?? "").trim() || undefined,
    sessionId: String(body.sessionId ?? getVmbTrialIdFromRequest(req) ?? "").trim() || undefined,
    lastRoute: String(body.lastRoute ?? req.headers.get("referer") ?? "").trim() || undefined,
    selected: selected
      ? {
          serviceId: typeof selected.serviceId === "string" ? selected.serviceId : undefined,
          cardId: typeof selected.cardId === "string" ? selected.cardId : undefined,
          inviteId: typeof selected.inviteId === "string" ? selected.inviteId : undefined,
        }
      : undefined,
  });

  return NextResponse.json({ ok: true, data: snapshot });
}
