export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { sendVmbBookingConfirmationEmail } from "@/lib/email";
import { getSalonInvitationApproval } from "@/lib/vmb/invites/salon-invitation-approval-store";
import {
  confirmClientBookingRequest,
  listSalonClaimTimeline,
} from "@/lib/vmb/invites/sent-invite-store";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ bookingRequestId: string }> },
) {
  const salonId = getVmbTrialIdFromRequest(request);
  if (!salonId) return NextResponse.json({ ok: false, error: "Salon session required" }, { status: 401 });

  const { bookingRequestId } = await context.params;
  const timeline = await listSalonClaimTimeline(salonId);
  const item = timeline.find((row) => row.bookingRequest?.id === bookingRequestId);
  if (!item?.bookingRequest) {
    return NextResponse.json({ ok: false, error: "Booking request not found" }, { status: 404 });
  }

  let confirmationEmailStatus: "sent" | "stubbed" | "disabled" | "failed" | "not_requested" = "not_requested";
  let confirmationEmailTransport: "resend" | "stub" | "off" | undefined;
  const approval = await getSalonInvitationApproval(salonId, item.sentInvite.sourceApprovalId);
  if (approval?.clientEmail) {
    try {
      const delivery = await sendVmbBookingConfirmationEmail({
        recipientEmail: approval.clientEmail,
        recipientName: item.claim?.clientName ?? item.sentInvite.snapshot.recipientName,
        salonName: item.sentInvite.snapshot.salonDisplayName,
        providerName: item.sentInvite.snapshot.providerName,
        inviteTypeLabel: item.sentInvite.snapshot.inviteTypeLabel,
        serviceLine: item.bookingRequest.booking?.serviceLine ?? "Private salon gift",
        requestedSlot: item.bookingRequest.booking?.requestedSlot ?? item.bookingRequest.requestedSlot ?? "Time requested",
        selectedLevelUps: item.bookingRequest.booking?.selectedLevelUps,
        total: item.bookingRequest.booking?.total,
      });
      confirmationEmailStatus = delivery.status;
      confirmationEmailTransport = delivery.transport;
    } catch (error) {
      console.error("[vmb-booking-confirmation-email]", error);
      confirmationEmailStatus = "failed";
    }
  }

  const result = await confirmClientBookingRequest({
    salonId,
    bookingRequestId,
    confirmationEmailStatus,
    confirmationEmailTransport,
  });
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    bookingRequest: result.intent,
    alreadyBooked: result.alreadyBooked,
    confirmationEmailStatus,
    confirmationEmailTransport,
  });
}
