export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";
import { listSalonInvitationApprovals } from "@/lib/vmb/invites/salon-invitation-approval-store";
import {
  hashInviteClaimContact,
  maskRecipientContactSummary,
  normalizeRecipientContact,
} from "@/lib/vmb/invites/recipient-contact";
import {
  claimSentInviteById,
  listSalonClaimTimeline,
  recordClientInviteIntent,
} from "@/lib/vmb/invites/sent-invite-store";
import type { ClientInviteBookingRequest, ClientInviteIntentKind, SentInvite, SentInvitePublicSnapshot } from "@/lib/vmb/invites/sent-invite-types";

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

async function resolveVerifiedClientInvite(salonId: string, sentInviteId: string, rawContact: string) {
  const contact = normalizeRecipientContact(rawContact);
  if (!contact || contact.kind !== "email") {
    return { error: "Enter the email used for your invite.", status: 400 } as const;
  }

  const [timeline, approvals] = await Promise.all([
    listSalonClaimTimeline(salonId),
    listSalonInvitationApprovals(salonId),
  ]);
  const item = timeline.find((row) => row.sentInvite.id === sentInviteId);
  if (!item) return { error: "Invite not found.", status: 404 } as const;

  const approval = approvals.find((row) => row.id === item.sentInvite.sourceApprovalId);
  if (!approval || approval.clientEmail?.trim().toLowerCase() !== contact.value) {
    return { error: "No invite found for that email.", status: 404 } as const;
  }

  if (new Date(item.sentInvite.expiresAt).getTime() <= Date.now()) {
    return { error: "This invite has expired.", status: 410 } as const;
  }
  if (["redeemed", "cancelled", "expired"].includes(item.sentInvite.status)) {
    return { error: "This invite is no longer available.", status: 410 } as const;
  }

  return { item, contact, approval } as const;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sentInviteId: string }> },
) {
  const salonId = getVmbTrialIdFromRequest(request);
  if (!salonId) return NextResponse.json({ ok: false, error: "Salon page session required" }, { status: 401 });

  const { sentInviteId } = await context.params;
  const rawContact = request.nextUrl.searchParams.get("contact") ?? "";
  const resolved = await resolveVerifiedClientInvite(salonId, sentInviteId, rawContact);
  if ("error" in resolved) {
    return NextResponse.json({ ok: false, error: resolved.error }, { status: resolved.status });
  }

  return NextResponse.json({
    ok: true,
    invite: toClientInviteDto(resolved.item.sentInvite, Boolean(resolved.item.claim)),
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sentInviteId: string }> },
) {
  const salonId = getVmbTrialIdFromRequest(request);
  if (!salonId) return NextResponse.json({ ok: false, error: "Salon page session required" }, { status: 401 });

  const { sentInviteId } = await context.params;
  let body: { contact?: string; clientName?: string; action?: string; note?: string; requestedSlot?: string; booking?: ClientInviteBookingRequest };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const resolved = await resolveVerifiedClientInvite(salonId, sentInviteId, String(body.contact ?? ""));
  if ("error" in resolved) {
    return NextResponse.json({ ok: false, error: resolved.error }, { status: resolved.status });
  }

  const clientName = body.clientName?.trim() || resolved.item.sentInvite.snapshot.recipientName || resolved.approval.clientName;
  const recipientContactSummary = maskRecipientContactSummary(resolved.contact);
  const recipientContactHash = hashInviteClaimContact(resolved.item.sentInvite.id, resolved.contact);
  const result = await claimSentInviteById({
    salonId,
    sentInviteId,
    clientName,
    recipientContactSummary,
    recipientContactHash,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  const action = body.action?.trim() || "claim";
  const intentByAction: Record<string, ClientInviteIntentKind | undefined> = {
    claim: "gift_saved",
    book: "booking_requested",
    personalize: "personalization_requested",
    hold: "hold_requested",
  };
  const intentKind = intentByAction[action];
  if (!intentKind) {
    return NextResponse.json({ ok: false, error: "Unknown invite action" }, { status: 400 });
  }
  const intent = await recordClientInviteIntent({
    salonId,
    sentInviteId,
    kind: intentKind,
    clientName,
    recipientContactSummary,
    recipientContactHash,
    note: body.note,
    requestedSlot: body.requestedSlot,
    booking: body.booking,
  });
  if ("error" in intent) {
    return NextResponse.json({ ok: false, error: intent.error }, { status: intent.status });
  }

  return NextResponse.json({
    ok: true,
    alreadyClaimed: result.existing,
    action,
    intent: intent.intent.kind,
    message: result.existing ? "Invite already saved." : "Invite saved.",
  });
}
