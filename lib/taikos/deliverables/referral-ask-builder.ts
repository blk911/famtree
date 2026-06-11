import type { AiosContextPacket } from "@/lib/taikos/types";
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
  const fn = firstName(referrer);

  return {
    draftId: `referral-${ctx.salonId}-${Date.now()}`,
    type: "referral_ask",
    title: "Referral Ask",
    referrer,
    message: `Hi ${fn} — you've always sent the best friends my way. I'm opening a few referral spots this month. If someone comes to mind, I'd love an intro.`,
    rewardSuggestion: referralOpp?.description ?? "Bring-a-friend touch on next visit",
    status: "preview",
  };
}
