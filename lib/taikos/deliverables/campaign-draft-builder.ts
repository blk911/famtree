import type { AiosContextPacket } from "@/lib/taikos/types";
import type { CampaignDeliverable } from "./types";

export function buildCampaignDeliverable(ctx: AiosContextPacket): CampaignDeliverable {
  const opp = ctx.opportunities[0];
  const audience = ctx.hasRealBookData
    ? `${ctx.pcnSummary.invitesReady || ctx.revenueSummary.touchesReady} clients from this week's book`
    : "Connect your book to target real clients";

  return {
    draftId: `campaign-${ctx.salonId}-${Date.now()}`,
    type: "campaign",
    title: opp?.title ?? "Weekly Relationship Campaign",
    objective: opp?.description ?? "Grow bookings and referrals from your existing book.",
    audience,
    message: `This week's move from ${ctx.salonName}: ${opp?.description ?? "Review invites and revenue touches from Home."}`,
    recommendedSendWindow: "Tuesday–Thursday mornings",
    estimatedValue: opp?.estimatedValue ?? ctx.revenueSummary.potentialRevenue,
    status: "preview",
  };
}
