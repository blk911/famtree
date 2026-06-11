import type { AiosContextPacket } from "@/lib/taikos/types";
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

  const message =
    options?.variant === "invite"
      ? `Hi ${fn} — ${salon} has a spot reserved for you this week. Reply if you'd like me to hold it.`
      : `Hi ${fn} — I'm opening a private client network for my favorite clients. You'll get first access to openings, special service drops, and invite-only offers. I'd love to have you in.`;

  const estimatedValue = ctx.hasRealBookData
    ? ctx.contactCandidates.slice(0, 5).reduce((s, c) => s + c.estimatedValue, 0)
    : 0;

  return {
    draftId: `invite-${ctx.salonId}-${Date.now()}`,
    type: "invite",
    title: "Private Client Network Invitation",
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
