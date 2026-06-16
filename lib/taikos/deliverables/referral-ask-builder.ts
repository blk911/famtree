import type { AiosContextPacket } from "@/lib/taikos/types";
import { getRelationshipFirstCard } from "@/lib/vmb/cards/relationship-first-invite-copy";
import type { ReferralAskDeliverable } from "./types";

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function buildReferralAskDeliverable(ctx: AiosContextPacket): ReferralAskDeliverable {
  const referralOpp = ctx.opportunities.find((o) => o.sourceRule === "referral");
  const candidate = ctx.hasRealBookData
    ? ctx.contactCandidates.find((c) => /referral/i.test(c.reason)) ?? ctx.contactCandidates[0]
    : undefined;

  const referrer = candidate?.clientName ?? "A loyal client";
  const referralCard = getRelationshipFirstCard("referral_invite");
  const fn = firstName(referrer);

  return {
    draftId: `referral-${ctx.salonId}-${Date.now()}`,
    type: "referral_ask",
    title: referralCard.label,
    referrer,
    message: `Hi ${fn} — ${referralCard.messageTemplate.split("\n\n")[0]}`,
    rewardSuggestion: referralOpp?.description ?? referralCard.offerTemplate ?? "Referral thank-you",
    status: "preview",
  };
}
