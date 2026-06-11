import type { AiosContextPacket } from "@/lib/taikos/types";
import type { CalendarGapDeliverable } from "./types";

export function buildCalendarGapDeliverable(ctx: AiosContextPacket): CalendarGapDeliverable {
  const likely = ctx.hasRealBookData
    ? ctx.saturdayCandidates.slice(0, 4).map((c) => c.clientName)
    : [];

  return {
    draftId: `calendar-${ctx.salonId}-${Date.now()}`,
    type: "calendar_gap",
    title: "Saturday Fill Opportunities",
    slots: ctx.calendarSummary.slots,
    likelyClients: likely,
    message:
      likely.length > 0
        ? `These clients are likely to fill ${ctx.calendarSummary.slots[0] ?? "an opening"}.`
        : "Connect your book to see likely Saturday bookings.",
    status: "preview",
  };
}
