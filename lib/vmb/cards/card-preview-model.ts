import type { CardAccent, CardImageLayout, VmbCardType } from "@/lib/vmb/cards/card-types";

export type CardImageSlot = {
  id: string;
  label: string;
};

/** Reserved for future personalization — render gracefully when missing. */
export type CardPersonalizationMetadata = {
  recipientName?: string;
  serviceName?: string;
  lastVisit?: string;
  birthday?: string;
  referralCount?: number;
  ticketValue?: number;
};

export type CardPreviewModel = {
  cardType: VmbCardType;
  salutation: string;
  title: string;
  subtitle: string;
  body: string;
  imageLayout: CardImageLayout;
  imageSlots: CardImageSlot[];
  accent: CardAccent;
  cta: string;
  tags: string[];
  metadata: CardPersonalizationMetadata;
};

export type CardTemplateInput = {
  cardType: VmbCardType;
  recipientName?: string;
  salonName?: string;
  serviceName?: string;
  lastVisit?: string;
  birthday?: string;
  referralCount?: number;
  ticketValue?: number;
};
