import type { AiosContextPacket } from "@/lib/taikos/types";
import {
  assembleRelationshipFirstInviteMessage,
  getRelationshipFirstCard,
} from "@/lib/vmb/cards/relationship-first-invite-copy";
import type { InviteDeliverable } from "./types";

export function buildPcnInviteDeliverable(
  ctx: AiosContextPacket,
  _options?: { variant?: "pcn" | "invite" },
): InviteDeliverable {
  const clients = ctx.hasRealBookData
    ? ctx.contactCandidates.slice(0, 5).map((c) => c.clientName)
    : ["Taylor Brooks"];

  const primary = clients[0] ?? "your client";
  const pcnCard = getRelationshipFirstCard("private_client_network");
  const message = assembleRelationshipFirstInviteMessage(pcnCard, {
    clientName: primary,
    ownerName: ctx.operatorName,
    salonName: ctx.salonName,
  });

  const estimatedValue = ctx.hasRealBookData
    ? ctx.contactCandidates.slice(0, 5).reduce((s, c) => s + c.estimatedValue, 0)
    : 0;

  return {
    draftId: `invite-${ctx.salonId}-${Date.now()}`,
    type: "invite",
    title: pcnCard.label,
    audience:
      clients.length > 1
        ? `${clients.length} recommended clients not yet invited`
        : "Top recommended client not yet invited",
    message,
    suggestedClients: clients,
    estimatedValue,
    status: "preview",
  };
}
