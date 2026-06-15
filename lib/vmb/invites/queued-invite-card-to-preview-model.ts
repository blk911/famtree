import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";
import { VMB_CARD_TYPES, type VmbCardType } from "@/lib/vmb/cards/card-types";
import type { QueuedInviteCardPayload } from "@/lib/vmb/cards/queued-invite-card-payload";

function normalizeCardType(cardType: string): VmbCardType {
  if ((VMB_CARD_TYPES as readonly string[]).includes(cardType)) {
    return cardType as VmbCardType;
  }
  return "pcn_invite";
}

export function queuedInviteCardToPreviewModel(
  card: QueuedInviteCardPayload,
  context: { salonDisplayName: string; techName?: string },
): CardPreviewModel {
  return {
    cardType: normalizeCardType(card.cardType),
    salutation: "",
    title: card.actionLabel,
    subtitle: "",
    body: "",
    imageLayout: "collage",
    imageSlots: [],
    accent: "rose",
    cta: card.primaryCta,
    tags: [],
    metadata: { recipientName: card.recipientName },
    inviteCopy: {
      greeting: card.greeting,
      personalConnection: card.personalConnection ?? "",
      inviteMessage: card.inviteMessage ?? "",
      offerMessage: card.offerMessage ?? "",
      signature: card.signature ?? "",
      primaryCta: card.primaryCta,
      secondaryCta: card.secondaryCta ?? "",
    },
    techName: context.techName,
    salonDisplayName: context.salonDisplayName,
    includeOffer: Boolean(card.offerMessage?.trim()),
  };
}
