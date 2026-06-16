export type VmbCardType =
  | "pcn_invite"
  | "refresh_card"
  | "reactivation_card"
  | "vip_thank_you"
  | "referral_invite"
  | "birthday_card"
  | "open_slot_fill"
  | "service_card";

/** Salon invite card order — matches numbered relationship-first preset list (1–8). */
export const VMB_CARD_TYPES: readonly VmbCardType[] = [
  "pcn_invite",
  "refresh_card",
  "reactivation_card",
  "open_slot_fill",
  "referral_invite",
  "vip_thank_you",
  "birthday_card",
  "service_card",
] as const;

export type CardImageLayout = "single" | "dual" | "collage";

export type CardAccent = "rose" | "gold" | "sage" | "slate" | "plum";
