import type { AiosContextPacket } from "@/lib/taikos/types";
import {
  assembleRelationshipFirstInviteMessage,
  getRelationshipFirstCard,
} from "@/lib/vmb/cards/relationship-first-invite-copy";
import type { ReferralAskDeliverable } from "./types";

export function buildReferralAskDeliverable(ctx: AiosContextPacket): ReferralAskDeliverable {
  const referralOpp = ctx.opportunities.find((o) => o.sourceRule === "referral");
  const candidate = ctx.hasRealBookData
    ? ctx.contactCandidates.find((c) => /referral/i.test(c.reason)) ?? ctx.contactCandidates[0]
    : undefined;

  const referrer = candidate?.clientName ?? "A loyal client";
  const referralCard = getRelationshipFirstCard("referral_invite");

  return {
    draftId: `referral-${ctx.salonId}-${Date.now()}`,
    type: "referral_ask",
    title: referralCard.label,
    referrer,
    message: assembleRelationshipFirstInviteMessage(referralCard, {
      clientName: referrer,
      ownerName: ctx.operatorName,
      salonName: ctx.salonName,
    }),
    rewardSuggestion: referralOpp?.description ?? referralCard.offerTemplate ?? "Referral thank-you",
    status: "preview",
  };
}
