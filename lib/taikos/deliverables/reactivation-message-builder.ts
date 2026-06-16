import type { AiosContextPacket } from "@/lib/taikos/types";
import {
  assembleRelationshipFirstInviteMessage,
  getRelationshipFirstCard,
} from "@/lib/vmb/cards/relationship-first-invite-copy";
import type { ReactivationDeliverable } from "./types";

export function buildReactivationDeliverable(ctx: AiosContextPacket): ReactivationDeliverable {
  const top = ctx.hasRealBookData
    ? ctx.overdueClients[0] ?? ctx.contactCandidates[0]
    : undefined;

  const client = top?.clientName ?? "Amanda";
  const reason = top?.reason ?? "Overdue for visit";
  const weMissYouCard = getRelationshipFirstCard("we_miss_you");

  return {
    draftId: `reactivation-${ctx.salonId}-${Date.now()}`,
    type: "reactivation",
    title: weMissYouCard.label,
    client,
    message: assembleRelationshipFirstInviteMessage(weMissYouCard, {
      clientName: client,
      ownerName: ctx.operatorName,
      salonName: ctx.salonName,
    }),
    reason,
    estimatedValue: top?.estimatedValue ?? 0,
    status: "preview",
  };
}
