import { hasLoadedBookData } from "@/lib/taikos/context/has-loaded-book";
import type { AiosContextPacket } from "@/lib/taikos/types";
import type { ClientSegmentDeliverable } from "./types";

export function buildClientSegmentDeliverable(ctx: AiosContextPacket): ClientSegmentDeliverable {
  const bookLoaded = hasLoadedBookData(ctx);
  const names = bookLoaded ? ctx.overdueClients.slice(0, 8).map((c) => c.clientName) : [];

  return {
    draftId: `segment-${ctx.salonId}-${Date.now()}`,
    type: "client_segment",
    title: "Overdue Clients",
    segment: "overdue",
    clientNames: names,
    count: bookLoaded ? ctx.clientSummary.overdueClients : 0,
    filterHref: "/vmb/clients",
    status: "preview",
  };
}
