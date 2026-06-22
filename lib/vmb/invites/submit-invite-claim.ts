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
import { claimSentInvite } from "./sent-invite-store";

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
};

export type SubmitInviteClaimResult =
  | { ok: true; alreadyClaimed: boolean }
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
  return { ok: true, alreadyClaimed: result.existing };
}
