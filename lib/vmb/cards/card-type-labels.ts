import type { VmbCardType } from "@/lib/vmb/cards/card-types";

const CARD_ACTION_LABELS: Record<VmbCardType, string> = {
  pcn_invite: "Private Client Network",
  birthday_card: "Birthday",
  refresh_card: "Refresh Reminder",
  vip_thank_you: "VIP Thank You",
  referral_invite: "Referral Invite",
  reactivation_card: "We Miss You",
  open_slot_fill: "Opening Just Became Available",
  service_card: "Favorite Providers",
};

const CODA_ACTION_LABELS: Record<string, string> = {
  "Send PCN Invite": "Private Client Invite",
  "Send Refresh Invite": "Refresh Invite",
  "Create VIP Card": "Thank You Invite",
  "Generate Referral Opportunity": "Referral Invite",
  "Create Birthday Card": "Birthday Card",
  "Create Reactivation Card": "Reactivation Invite",
  "Queue Smart Send": "Smart Send",
};

export function cardActionLabel(cardType: VmbCardType, suggestedAction?: string): string {
  if (suggestedAction?.trim()) {
    const mapped = CODA_ACTION_LABELS[suggestedAction.trim()];
    if (mapped) return mapped;
  }
  return CARD_ACTION_LABELS[cardType];
}

export function isPersonalInviteCard(cardType: VmbCardType): boolean {
  return cardType === "pcn_invite";
}
