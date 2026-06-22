export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { sendApprovedInvitation } from "@/lib/vmb/invites/create-sent-invite";
import { buildRecipientInviteUrl } from "@/lib/vmb/invites/recipient-invite-url";
import { listSalonClaimTimeline } from "@/lib/vmb/invites/sent-invite-store";
import { toSalonClaimTimelineDto, toSentInviteSummaryDto } from "@/lib/vmb/invites/sent-invite-dto";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";
import { getSalonInvitationApproval } from "@/lib/vmb/invites/salon-invitation-approval-store";
import { sendVmbOfferInviteEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  const salonId = getVmbTrialIdFromRequest(request);
  if (!salonId) return NextResponse.json({ ok: false, error: "Salon session required" }, { status: 401 });
  const timeline = await listSalonClaimTimeline(salonId);
  return NextResponse.json({ ok: true, timeline: timeline.map(toSalonClaimTimelineDto) });
}

export async function POST(request: NextRequest) {
  const salonId = getVmbTrialIdFromRequest(request);
  if (!salonId) return NextResponse.json({ ok: false, error: "Salon session required" }, { status: 401 });
  let body: { approvalId?: string; expiresAt?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.approvalId?.trim()) return NextResponse.json({ ok: false, error: "approvalId required" }, { status: 400 });
  const result = await sendApprovedInvitation({ salonId, approvalId: body.approvalId.trim(), expiresAt: body.expiresAt });
  if ("error" in result) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
  const recipientUrl = buildRecipientInviteUrl(result.recipientToken, origin);
  const approval = await getSalonInvitationApproval(salonId, body.approvalId.trim());
  let deliveryStatus: "sent" | "skipped" | "failed" | "not_requested" = "not_requested";
  if (approval?.clientEmail) {
    try {
      deliveryStatus = await sendVmbOfferInviteEmail({
        recipientEmail: approval.clientEmail,
        recipientName: approval.clientName,
        salonName: approval.snapshot.salonName?.trim() || "Your Salon",
        headline: approval.snapshot.headline,
        recipientUrl,
      });
    } catch (error) {
      console.error("[vmb-sent-invite-email]", error);
      deliveryStatus = "failed";
    }
  }
  return NextResponse.json({
    ok: true,
    sentInvite: toSentInviteSummaryDto(result.sentInvite),
    recipientUrl,
    deliveryStatus,
  });
}
