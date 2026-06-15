export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { submitInviteClaim } from "@/lib/vmb/invites/submit-invite-claim";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      inviteId?: string;
      name?: string;
      contact?: string;
    };

    const result = await submitInviteClaim({
      inviteId: String(body.inviteId ?? ""),
      name: body.name !== undefined ? String(body.name) : undefined,
      contact: String(body.contact ?? ""),
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      alreadyClaimed: result.alreadyClaimed,
      message: "You're on the list — the salon can follow up with next steps.",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Claim failed" }, { status: 500 });
  }
}
