import type { AiosContextPacket } from "@/lib/taikos/types";
import type { ClientSegmentDeliverable } from "./types";

export function buildClientSegmentDeliverable(ctx: AiosContextPacket): ClientSegmentDeliverable {
  const names = ctx.hasRealBookData
    ? ctx.overdueClients.slice(0, 8).map((c) => c.clientName)
    : [];

  return {
    draftId: `segment-${ctx.salonId}-${Date.now()}`,
    type: "client_segment",
    title: "Overdue Clients",
    segment: "overdue",
    clientNames: names,
    count: ctx.hasRealBookData ? ctx.clientSummary.overdueClients : 0,
    filterHref: "/vmb/clients",
    status: "preview",
  };
}
