import type { VmbCardType } from "@/lib/vmb/cards/card-types";

const CARD_ACTION_LABELS: Record<VmbCardType, string> = {
  pcn_invite: "Private Client Invite",
  birthday_card: "Birthday Card",
  refresh_card: "Refresh Invite",
  vip_thank_you: "Thank You Invite",
  referral_invite: "Referral Invite",
  reactivation_card: "Reactivation Invite",
  open_slot_fill: "Open Slot Invite",
  service_card: "Service Card",
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
