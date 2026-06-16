import type { AiosContextPacket } from "@/lib/taikos/types";
import { getRelationshipFirstCard } from "@/lib/vmb/cards/relationship-first-invite-copy";
import type { ServiceCardDeliverable } from "./types";

export function buildServiceCardDeliverable(
  ctx: AiosContextPacket,
  serviceName = "Gel Fill + Design",
): ServiceCardDeliverable {
  const favoriteProvidersCard = getRelationshipFirstCard("favorite_providers");

  return {
    draftId: `service-card-${ctx.salonId}-${Date.now()}`,
    type: "service_card",
    title: favoriteProvidersCard.label,
    serviceName,
    description: favoriteProvidersCard.relationshipBenefitTemplate,
    priceDisplay: "From $85",
    visualPrompt: `Warm salon flat-lay: ${serviceName}, neutral stone palette, soft natural light`,
    callToAction: favoriteProvidersCard.primaryCta,
    status: "preview",
  };
}
