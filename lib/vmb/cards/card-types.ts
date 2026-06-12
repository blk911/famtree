export type VmbCardType =
  | "pcn_invite"
  | "refresh_card"
  | "reactivation_card"
  | "vip_thank_you"
  | "referral_invite"
  | "birthday_card"
  | "open_slot_fill"
  | "service_card";

export const VMB_CARD_TYPES: readonly VmbCardType[] = [
  "pcn_invite",
  "refresh_card",
  "reactivation_card",
  "vip_thank_you",
  "referral_invite",
  "birthday_card",
  "open_slot_fill",
  "service_card",
] as const;

export type CardImageLayout = "single" | "collage";

export type CardAccent = "rose" | "gold" | "sage" | "slate" | "plum";
