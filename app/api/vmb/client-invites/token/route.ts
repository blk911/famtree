export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { resolveRecipientInvite } from "@/lib/vmb/invites/resolve-recipient-invite";
import type { SentInvite, SentInvitePublicSnapshot } from "@/lib/vmb/invites/sent-invite-types";

type PublicClientInviteDto = {
  id: string;
  status: SentInvite["status"];
  alreadyClaimed: boolean;
  sentAt: string;
  expiresAt: string;
  snapshot: SentInvitePublicSnapshot;
};

function toPublicClientInviteDto(invite: SentInvite): PublicClientInviteDto {
  return {
    id: invite.id,
    status: invite.status,
    alreadyClaimed: invite.status === "claimed" || invite.status === "redeemed",
    sentAt: invite.sentAt,
    expiresAt: invite.expiresAt,
    snapshot: invite.snapshot,
  };
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const resolved = await resolveRecipientInvite(token);
  if (resolved.status === "not_found" || !resolved.sentInvite) {
    return NextResponse.json({ ok: false, error: "Invite not found." }, { status: 404 });
  }
  if (resolved.status === "expired") {
    return NextResponse.json({ ok: false, error: resolved.message }, { status: 410 });
  }

  return NextResponse.json({
    ok: true,
    invite: toPublicClientInviteDto(resolved.sentInvite),
  });
}
