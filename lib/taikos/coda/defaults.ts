import type { CodaSummary } from "./types";

export function emptyCodaSummary(ownerName = "Owner"): CodaSummary {
  return {
    context: {
      salonId: "",
      ownerName,
      currentPhase: "onboarding",
      verified: false,
      importedClientCount: 0,
      pcnMemberCount: 0,
    },
    objective: {
      id: "pending",
      label: "Complete Your Salon Setup",
      priority: 1,
    },
    insights: [],
    insightCount: 0,
    opportunityCount: 0,
  };
}
