import { appendInviteEvent } from "./append-invite-event";
import {
  hashInviteClaimContact,
  maskRecipientContactSummary,
  normalizeRecipientContact,
  normalizeRecipientName,
} from "./recipient-contact";
import type { RecipientInviteClientView } from "./recipient-invite-view";
import { assertNoAdminFieldsInRecipientPayload } from "./recipient-invite-view";
import { resolveRecipientInvite } from "./resolve-recipient-invite";
import { claimSentInvite, recordClientInviteIntent } from "./sent-invite-store";
import type { ClientInviteBookingRequest, ClientInviteIntentKind } from "./sent-invite-types";

export type RecipientInviteClaimView = {
  inviteId: string;
  salonDisplayName: string;
  primaryCta: string;
  inviteSummary: string;
  knownRecipientName?: string;
  nameRequired: boolean;
};

export type SubmitInviteClaimInput = {
  inviteId: string;
  name?: string;
  contact: string;
  action?: string;
  note?: string;
  requestedSlot?: string;
  booking?: ClientInviteBookingRequest;
};

export type SubmitInviteClaimResult =
  | { ok: true; alreadyClaimed: boolean; intent?: ClientInviteIntentKind }
  | { ok: false; error: string; status: 400 | 404 | 409 | 410 | 500 | 503 };

export function toRecipientInviteClaimView(view: RecipientInviteClientView): RecipientInviteClaimView {
  const knownRecipientName = view.previewModel.metadata.recipientName?.trim() || undefined;
  const inviteSummary =
    view.previewModel.inviteCopy?.inviteMessage?.trim() ||
    view.previewModel.title?.trim() ||
    view.primaryCta;

  const claimView: RecipientInviteClaimView = {
    inviteId: view.inviteId,
    salonDisplayName: view.salonDisplayName,
    primaryCta: view.primaryCta,
    inviteSummary,
    knownRecipientName,
    nameRequired: !knownRecipientName,
  };
  assertNoAdminFieldsInRecipientPayload(claimView);
  return claimView;
}

export async function submitInviteClaim(
  input: SubmitInviteClaimInput,
): Promise<SubmitInviteClaimResult> {
  const inviteId = input.inviteId.trim();
  if (!inviteId) {
    return { ok: false, error: "Invite id required", status: 400 };
  }

  const resolved = await resolveRecipientInvite(inviteId);
  if (resolved.status === "not_found") {
    return { ok: false, error: "Invite not found", status: 404 };
  }
  if (resolved.status === "expired") {
    return { ok: false, error: resolved.message, status: 410 };
  }
  if (!resolved.sentInvite) {
    return { ok: false, error: "Invite unavailable", status: 404 };
  }

  const contact = normalizeRecipientContact(input.contact);
  if (!contact) {
    return { ok: false, error: "Enter a valid mobile number or email", status: 400 };
  }

  const knownName = resolved.sentInvite.snapshot.recipientName.trim();
  const submittedName = input.name?.trim();
  const clientName = knownName || (submittedName ? normalizeRecipientName(submittedName) : null);
  if (!clientName) {
    return { ok: false, error: "Name is required", status: 400 };
  }

  const contactHash = hashInviteClaimContact(resolved.sentInvite.id, contact);
  const result = await claimSentInvite({
    token: inviteId,
    clientName,
    recipientContactSummary: maskRecipientContactSummary(contact),
    recipientContactHash: contactHash,
  });
  if (!result.ok) {
    return { ok: false, error: result.error, status: result.status };
  }
  if (!result.existing) void appendInviteEvent({
    eventType: "invite_claimed",
    salonId: resolved.sentInvite.salonId,
    payload: {
      inviteId,
      clientName,
      salonDisplayName: resolved.view.salonDisplayName,
      recipientContactSummary: maskRecipientContactSummary(contact),
      recipientContactHash: contactHash,
      channel: "recipient_claim",
    },
  });
  const action = input.action?.trim() || "claim";
  const intentByAction: Record<string, ClientInviteIntentKind | undefined> = {
    claim: "gift_saved",
    book: "booking_requested",
    personalize: "personalization_requested",
    hold: "hold_requested",
  };
  const intentKind = intentByAction[action];
  if (!intentKind) {
    return { ok: false, error: "Unknown invite action", status: 400 };
  }
  if (action !== "claim") {
    const intent = await recordClientInviteIntent({
      salonId: resolved.sentInvite.salonId,
      sentInviteId: resolved.sentInvite.id,
      kind: intentKind,
      clientName,
      recipientContactSummary: maskRecipientContactSummary(contact),
      recipientContactHash: contactHash,
      note: input.note,
      requestedSlot: input.requestedSlot,
      booking: input.booking,
    });
    if ("error" in intent) return { ok: false, error: intent.error, status: intent.status };
  }
  return { ok: true, alreadyClaimed: result.existing, intent: intentKind };
}
