import type { ServiceCategoryId } from "@/lib/vmb/services/canonical-catalog-types";

/** Lightweight offer categories for invite ↔ offer matching (Nails first). */
export type VmbInviteOfferCategory =
  | "birthday"
  | "vacation"
  | "wedding"
  | "self_care"
  | "seasonal"
  | "referral"
  | "refresh"
  | "open_chair"
  | "vip"
  | "new_client"
  | "pcn";

export const VMB_INVITE_OFFER_CATEGORIES: readonly VmbInviteOfferCategory[] = [
  "birthday",
  "vacation",
  "wedding",
  "self_care",
  "seasonal",
  "referral",
  "refresh",
  "open_chair",
  "vip",
  "new_client",
  "pcn",
] as const;

export type VmbInviteType =
  | "private_client_network"
  | "birthday_celebration"
  | "referral_invite"
  | "open_chair"
  | "refresh_reminder"
  | "we_miss_you"
  | "vip_thank_you"
  | "favorite_providers"
  | "first_visit_thank_you"
  | "new_client_welcome";

export const VMB_NAILS_INVITE_TYPES: readonly VmbInviteType[] = [
  "private_client_network",
  "birthday_celebration",
  "referral_invite",
  "open_chair",
  "refresh_reminder",
  "we_miss_you",
  "vip_thank_you",
  "favorite_providers",
  "first_visit_thank_you",
  "new_client_welcome",
] as const;

export type VmbDefaultInvitationPackage = {
  /** Canonical service offer ids (Admin Default — no salon override yet). */
  serviceIds: string[];
  /** Add-on / perk ids included with the invitation. */
  serviceOptionIds: string[];
  /** Human-readable expiration window shown on cards. */
  expirationLabel: string;
  /** Suggested offer discount in USD for this event package. */
  savingsAmount?: number;
  /** Optional marketing caption — separate from calculated Offer price. */
  priceLabel?: string;
  termsText?: string;
};

export type VmbInviteTemplate = {
  id: string;
  categoryId: ServiceCategoryId;
  inviteType: VmbInviteType;
  displayName: string;
  intent: string;
  subject: string;
  eyebrow: string;
  headline: string;
  body: string;
  ctaLabel: string;
  defaultOfferCategory: VmbInviteOfferCategory;
  allowedOfferCategories: VmbInviteOfferCategory[];
  /** Admin Default service / add-on / expiration package for this invite type. */
  defaultPackage: VmbDefaultInvitationPackage;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type InviteTemplateTokenContext = {
  clientName: string;
  salonName: string;
  providerName: string;
  offerName?: string;
  offerPrice?: string;
  claimLink?: string;
};

export type InviteTemplateRenderOffer = {
  name: string;
  description: string;
  priceLabel: string;
  serviceName: string;
  addonLabels: string[];
};

export type InviteTemplateRenderPayload = {
  templateId: string;
  intent: string;
  eyebrow: string;
  headline: string;
  body: string;
  ctaLabel: string;
  subject: string;
  categoryLabel: string;
  inviteTypeLabel: string;
  offer?: InviteTemplateRenderOffer;
};

/** Future salon overrides — not wired yet. Admin master templates remain source of truth. */
export type SalonInviteTemplateOverride = {
  salonId: string;
  templateId: string;
  subjectOverride?: string;
  headlineOverride?: string;
  bodyOverride?: string;
  ctaLabelOverride?: string;
  activeOverride?: boolean;
  updatedAt?: string;
};
