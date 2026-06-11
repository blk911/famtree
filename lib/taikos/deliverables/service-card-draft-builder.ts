import type { AiosContextPacket } from "@/lib/taikos/types";
import type { ServiceCardDeliverable } from "./types";

export function buildServiceCardDeliverable(
  ctx: AiosContextPacket,
  serviceName = "Gel Fill + Design",
): ServiceCardDeliverable {
  return {
    draftId: `service-card-${ctx.salonId}-${Date.now()}`,
    type: "service_card",
    title: "Service Card",
    serviceName,
    description: "Fresh shape, clean finish, custom detail work.",
    priceDisplay: "From $85",
    visualPrompt: `Warm salon flat-lay: ${serviceName}, neutral stone palette, soft natural light`,
    callToAction: "Book your next set",
    status: "preview",
  };
}
