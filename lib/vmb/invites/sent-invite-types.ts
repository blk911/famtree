export type SentInviteStatus =
  | "sent"
  | "opened"
  | "claimed"
  | "redeemed"
  | "expired"
  | "cancelled";

export type SentInvitePublicSnapshot = {
  salonDisplayName: string;
  providerName?: string;
  recipientName: string;
  inviteTypeLabel: string;
  headline: string;
  body: string;
  ctaLabel: string;
  services: string[];
  rewards: string[];
  expirationLabel?: string;
  termsText?: string;
  priceLabel?: string;
  ownerPhotoUrl?: string;
  salonLogoUrl?: string;
  serviceImageUrl?: string;
  inviteArtImageUrl?: string;
};

export type SentInvite = {
  id: string;
  salonId: string;
  sourceApprovalId: string;
  sourceCopyId: string;
  status: SentInviteStatus;
  tokenHash: string;
  snapshot: SentInvitePublicSnapshot;
  sentAt: string;
  openedAt?: string;
  claimedAt?: string;
  redeemedAt?: string;
  expiresAt: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type InviteClaim = {
  id: string;
  sentInviteId: string;
  salonId: string;
  clientName: string;
  recipientContactSummary: string;
  recipientContactHash: string;
  claimedAt: string;
};

export type ClientInviteIntentKind =
  | "gift_saved"
  | "personalization_requested"
  | "hold_requested"
  | "booking_requested";

export type ClientInviteBookingRequest = {
  serviceLine: string;
  selectedLevelUps: Array<{ label: string; price: number }>;
  requestedSlot: string;
  subtotal: number;
  tax: number;
  vmbComarket: number;
  total: number;
  paymentStatus: "stripe_stub";
};

export type ClientInviteIntent = {
  id: string;
  sentInviteId: string;
  salonId: string;
  kind: ClientInviteIntentKind;
  clientName: string;
  recipientContactSummary: string;
  recipientContactHash: string;
  note?: string;
  requestedSlot?: string;
  booking?: ClientInviteBookingRequest;
  createdAt: string;
};

export type SalonClaimTimelineItem = {
  sentInvite: SentInvite;
  claim?: InviteClaim;
  bookingRequest?: ClientInviteIntent;
};
