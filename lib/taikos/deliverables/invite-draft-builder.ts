import type { AiosContextPacket } from "@/lib/taikos/types";
import { getRelationshipFirstCard } from "@/lib/vmb/cards/relationship-first-invite-copy";
import type { InviteDeliverable } from "./types";

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function buildPcnInviteDeliverable(
  ctx: AiosContextPacket,
  options?: { variant?: "pcn" | "invite" },
): InviteDeliverable {
  const clients = ctx.hasRealBookData
    ? ctx.contactCandidates.slice(0, 5).map((c) => c.clientName)
    : ["Taylor Brooks"];

  const primary = clients[0] ?? "your client";
  const fn = firstName(primary);
  const salon = ctx.salonName;

  const pcnCard = getRelationshipFirstCard("private_client_network");
  const message =
    options?.variant === "invite"
      ? `Hi ${fn} — ${salon} has a spot reserved for you this week. Reply if you'd like me to hold it.`
      : `Hi ${fn} — ${pcnCard.relationshipBenefitTemplate.replace("{salonName}", salon)}`;

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
