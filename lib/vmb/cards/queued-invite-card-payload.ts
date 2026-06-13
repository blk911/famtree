import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";
import {
  buildPersonalInviteCopy,
  inviteCopyToBody,
} from "@/lib/vmb/cards/personal-invite-copy";

export type QueuedInviteCardPayload = {
  cardType: string;
  recipientName: string;
  actionLabel: string;
  greeting: string;
  personalConnection?: string;
  inviteMessage?: string;
  offerMessage?: string;
  signature?: string;
  primaryCta: string;
  secondaryCta?: string;
};

export function cardPreviewToQueuedInvitePayload(
  model: CardPreviewModel,
  recipientName: string,
  actionLabel: string,
): QueuedInviteCardPayload {
  const copy =
    model.inviteCopy ??
    buildPersonalInviteCopy({
      recipientName: model.metadata.recipientName ?? recipientName,
      serviceName: model.metadata.serviceName,
      lastVisit: model.metadata.lastVisit,
      ticketValue: model.metadata.ticketValue,
      techName: model.techName,
      salonName: model.salonDisplayName,
      cardType: model.cardType,
    });

  return {
    cardType: model.cardType,
    recipientName: recipientName.trim() || model.metadata.recipientName?.trim() || "Client",
    actionLabel: actionLabel.trim() || "Private Client Invite",
    greeting: copy.greeting,
    personalConnection: copy.personalConnection,
    inviteMessage: copy.inviteMessage,
    offerMessage: copy.offerMessage,
    signature: copy.signature,
    primaryCta: copy.primaryCta,
    secondaryCta: copy.secondaryCta,
  };
}

export function inviteCardToMessage(card: QueuedInviteCardPayload): string {
  return [
    card.greeting,
    card.personalConnection,
    card.inviteMessage,
    card.offerMessage,
    card.signature,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function parseQueuedInviteCardPayload(
  payload: Record<string, unknown> | undefined,
): QueuedInviteCardPayload | undefined {
  if (!payload || typeof payload.inviteCard !== "object" || !payload.inviteCard) {
    return undefined;
  }
  const raw = payload.inviteCard as Record<string, unknown>;
  const greeting = typeof raw.greeting === "string" ? raw.greeting.trim() : "";
  const primaryCta = typeof raw.primaryCta === "string" ? raw.primaryCta.trim() : "";
  if (!greeting || !primaryCta) return undefined;

  return {
    cardType: typeof raw.cardType === "string" ? raw.cardType : "pcn_invite",
    recipientName: typeof raw.recipientName === "string" ? raw.recipientName : "Client",
    actionLabel: typeof raw.actionLabel === "string" ? raw.actionLabel : "Private Client Invite",
    greeting,
    personalConnection:
      typeof raw.personalConnection === "string" ? raw.personalConnection : undefined,
    inviteMessage: typeof raw.inviteMessage === "string" ? raw.inviteMessage : undefined,
    offerMessage: typeof raw.offerMessage === "string" ? raw.offerMessage : undefined,
    signature: typeof raw.signature === "string" ? raw.signature : undefined,
    primaryCta,
    secondaryCta: typeof raw.secondaryCta === "string" ? raw.secondaryCta : undefined,
  };
}

export function mergeInviteCardIntoDraftPayload(
  payload: Record<string, unknown>,
  inviteCard: QueuedInviteCardPayload,
): Record<string, unknown> {
  return {
    ...payload,
    inviteCard,
    message: inviteCardToMessage(inviteCard),
  };
}

export function queueItemPreviewLine(
  inviteCard: QueuedInviteCardPayload | undefined,
  fallbackTitle: string,
): string {
  if (!inviteCard) return fallbackTitle;
  return `${inviteCard.recipientName} — ${inviteCard.actionLabel}`;
}

export function queueItemGreetingPreview(
  inviteCard: QueuedInviteCardPayload | undefined,
): string | undefined {
  if (!inviteCard?.greeting) return undefined;
  const snippet = inviteCard.personalConnection?.trim() || inviteCard.inviteMessage?.trim();
  return snippet ? `${inviteCard.greeting} ${snippet}` : inviteCard.greeting;
}

/** Prefer edited invite payload; otherwise build from generated card model. */
export function resolveInviteCardForDisplay(input: {
  payload?: Record<string, unknown>;
  fallbackModel?: CardPreviewModel;
  recipientName?: string;
  actionLabel?: string;
}): QueuedInviteCardPayload | undefined {
  const fromPayload = parseQueuedInviteCardPayload(input.payload);
  if (fromPayload) return fromPayload;
  if (input.fallbackModel) {
    return cardPreviewToQueuedInvitePayload(
      input.fallbackModel,
      input.recipientName ?? input.fallbackModel.metadata.recipientName ?? "Client",
      input.actionLabel ?? "Private Client Invite",
    );
  }
  return undefined;
}

export { inviteCopyToBody };
