import type { CardAccent, CardImageLayout, VmbCardType } from "@/lib/vmb/cards/card-types";
import type { PersonalInviteCopy } from "@/lib/vmb/cards/personal-invite-copy";
import type { VmbCardTemplate } from "@/lib/vmb/card-templates/card-template-types";
import type { CardPreviewOffer } from "@/lib/vmb/offers/offer-types";
import type { VmbOffer } from "@/lib/vmb/offers/offer-types";

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
  /** Blue Mountain personal invite sections (PCN). */
  inviteCopy?: PersonalInviteCopy;
  techName?: string;
  salonDisplayName?: string;
  templateId?: string;
  templateName?: string;
  offer?: CardPreviewOffer;
  includeOffer?: boolean;
  offerProminent?: boolean;
};

export type CardTemplateInput = {
  cardType: VmbCardType;
  recipientName?: string;
  salonName?: string;
  techName?: string;
  serviceName?: string;
  lastVisit?: string;
  birthday?: string;
  referralCount?: number;
  ticketValue?: number;
  subjectLabel?: string;
  visitCount?: number;
  discoveryText?: string;
  recommendationText?: string;
  /** Salon/trial id for template override lookup (async paths). */
  salonId?: string;
  /** Pre-resolved salon template — skips default seed when provided. */
  template?: VmbCardTemplate;
  /** Salon offer catalog entries for template offer slots. */
  offers?: VmbOffer[];
  /** Explicit offer override for this card build. */
  offer?: VmbOffer;
  selectedOfferId?: string;
  includeOffer?: boolean;
};
