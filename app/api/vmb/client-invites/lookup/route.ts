export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";
import { listSalonInvitationApprovals } from "@/lib/vmb/invites/salon-invitation-approval-store";
import { normalizeRecipientContact } from "@/lib/vmb/invites/recipient-contact";
import { listSalonClaimTimeline } from "@/lib/vmb/invites/sent-invite-store";
import type { SentInvite, SentInvitePublicSnapshot } from "@/lib/vmb/invites/sent-invite-types";

type ClientInviteDto = {
  id: string;
  status: SentInvite["status"];
  alreadyClaimed: boolean;
  sentAt: string;
  expiresAt: string;
  snapshot: SentInvitePublicSnapshot;
};

function toClientInviteDto(invite: SentInvite, alreadyClaimed: boolean): ClientInviteDto {
  return {
    id: invite.id,
    status: invite.status,
    alreadyClaimed,
    sentAt: invite.sentAt,
    expiresAt: invite.expiresAt,
    snapshot: invite.snapshot,
  };
}

export async function POST(request: NextRequest) {
  const salonId = getVmbTrialIdFromRequest(request);
  if (!salonId) return NextResponse.json({ ok: false, error: "Salon page session required" }, { status: 401 });

  let body: { email?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const contact = normalizeRecipientContact(String(body.email ?? ""));
  if (!contact || contact.kind !== "email") {
    return NextResponse.json({ ok: false, error: "Enter the email used for your invite." }, { status: 400 });
  }

  const [timeline, approvals] = await Promise.all([
    listSalonClaimTimeline(salonId),
    listSalonInvitationApprovals(salonId),
  ]);
  const matchingApprovalIds = new Set(
    approvals
      .filter((approval) => approval.clientEmail?.trim().toLowerCase() === contact.value)
      .map((approval) => approval.id),
  );
  const now = Date.now();
  const match = timeline.find((item) =>
    matchingApprovalIds.has(item.sentInvite.sourceApprovalId)
    && new Date(item.sentInvite.expiresAt).getTime() > now
    && !["redeemed", "cancelled", "expired"].includes(item.sentInvite.status),
  );

  if (!match) {
    return NextResponse.json({ ok: false, error: "No active invite found for that email." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    invite: toClientInviteDto(match.sentInvite, Boolean(match.claim)),
  });
}
