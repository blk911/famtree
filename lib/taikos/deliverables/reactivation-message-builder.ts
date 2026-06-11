import type { AiosContextPacket } from "@/lib/taikos/types";
import type { ReactivationDeliverable } from "./types";

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function buildReactivationDeliverable(ctx: AiosContextPacket): ReactivationDeliverable {
  const top = ctx.hasRealBookData
    ? ctx.overdueClients[0] ?? ctx.contactCandidates[0]
    : undefined;

  const client = top?.clientName ?? "Amanda";
  const fn = firstName(client);
  const reason = top?.reason ?? "Overdue for visit";

  return {
    draftId: `reactivation-${ctx.salonId}-${Date.now()}`,
    type: "reactivation",
    title: "Reactivation Touch",
    client,
    message: `Hi ${fn} — I was thinking about your last set and wanted to check in. I have a few openings this week if you want to refresh before the weekend.`,
    reason,
    estimatedValue: top?.estimatedValue ?? 0,
    status: "preview",
  };
}
