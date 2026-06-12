import type { AiosContextPacket } from "@/lib/taikos/types";
import type { TaikosContext, TaikosObjective } from "./types";

export function buildTaikosObjective(
  context: TaikosContext,
  ctx: AiosContextPacket,
): TaikosObjective {
  const reactivationHigh = ctx.clientSummary.likelyReactivations >= 3;
  const pcnLow = context.pcnMemberCount < 25;

  if (context.verified && context.importedClientCount >= 5 && pcnLow) {
    return {
      id: "launch-pcn",
      label: "Launch Private Client Network",
      priority: 1,
    };
  }

  if (context.pcnMemberCount > 100) {
    return {
      id: "strengthen-relationships",
      label: "Strengthen Relationships",
      priority: 1,
    };
  }

  if (reactivationHigh) {
    return {
      id: "reconnect-past-clients",
      label: "Reconnect Past Clients",
      priority: 2,
    };
  }

  if (context.currentPhase === "onboarding") {
    return {
      id: "complete-setup",
      label: "Complete Your Salon Setup",
      priority: 1,
    };
  }

  if (ctx.revenueSummary.potentialRevenue > 0) {
    return {
      id: "capture-revenue",
      label: "Capture Ready Revenue",
      priority: 2,
    };
  }

  return {
    id: "daily-relationship-moves",
    label: "Make Today's Relationship Moves",
    priority: 3,
  };
}
