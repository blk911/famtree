export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  createTrustedIntroRequest,
  listTrustedIntroRequests,
} from "@/lib/vmb/trusted-circle/intro-store";

export async function GET() {
  const requests = await listTrustedIntroRequests();
  return NextResponse.json({ ok: true, data: requests });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const result = await createTrustedIntroRequest({
      trialId: String(body.trialId ?? "").trim() || undefined,
      salonName: String(body.salonName ?? "").trim() || undefined,
      clientName: String(body.clientName ?? ""),
      clientEmail: String(body.clientEmail ?? "").trim() || undefined,
      clientPhone: String(body.clientPhone ?? "").trim() || undefined,
      requestedCategory: String(body.requestedCategory ?? body.providerCategory ?? ""),
      providerName: String(body.providerName ?? "").trim() || undefined,
      providerEmail: String(body.providerEmail ?? "").trim() || undefined,
      providerPhone: String(body.providerPhone ?? "").trim() || undefined,
    });

    if ("error" in result) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.request });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Intro request failed" },
      { status: 500 },
    );
  }
}
