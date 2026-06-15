import { appendInviteEvent } from "./append-invite-event";
import { hasInviteClaimForContact } from "./invite-event-store";
import {
  hashInviteClaimContact,
  maskRecipientContactSummary,
  normalizeRecipientContact,
  normalizeRecipientName,
} from "./recipient-contact";
import { buildRecipientInviteClaimPath } from "./recipient-invite-url";
import type { RecipientInviteClientView } from "./recipient-invite-view";
import { assertNoAdminFieldsInRecipientPayload } from "./recipient-invite-view";
import { resolveRecipientInvite } from "./resolve-recipient-invite";

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
  | { ok: false; error: string; status: 400 | 404 | 410 | 500 };

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
  if (!resolved.salonId) {
    return { ok: false, error: "Invite unavailable", status: 404 };
  }

  const contact = normalizeRecipientContact(input.contact);
  if (!contact) {
    return { ok: false, error: "Enter a valid mobile number or email", status: 400 };
  }

  const knownName = resolved.clientName?.trim() || resolved.view.previewModel.metadata.recipientName?.trim();
  const submittedName = input.name?.trim();
  const clientName = knownName || (submittedName ? normalizeRecipientName(submittedName) : null);
  if (!clientName) {
    return { ok: false, error: "Name is required", status: 400 };
  }

  const contactHash = hashInviteClaimContact(inviteId, contact);
  const alreadyClaimed = await hasInviteClaimForContact(resolved.salonId, inviteId, contactHash);
  if (alreadyClaimed) {
    return { ok: true, alreadyClaimed: true };
  }

  const appendResult = await appendInviteEvent({
    eventType: "invite_claimed",
    salonId: resolved.salonId,
    payload: {
      inviteId,
      draftId: resolved.view.draftId,
      clientName,
      salonDisplayName: resolved.view.salonDisplayName,
      recipientContactSummary: maskRecipientContactSummary(contact),
      recipientContactHash: contactHash,
      sourcePage: buildRecipientInviteClaimPath(inviteId),
      channel: "recipient_claim",
    },
  });

  if (!appendResult.ok) {
    return { ok: false, error: "Could not record claim", status: 500 };
  }

  return { ok: true, alreadyClaimed: false };
}
