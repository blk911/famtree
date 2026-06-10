import { DEMO_CLIENTS, DEMO_SALON_NAME, DEMO_START_ANALYSIS } from "@/lib/vmb/demo-data";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

/** Minimal analysis-shaped object for demo operating view when no upload exists. */
export function buildDemoOperatingAnalysis(): VmbBookAnalysisResult {
  const reactivationTargets = DEMO_CLIENTS.filter((c) => c.status === "lapsed").map((c, i) => ({
    id: `demo-reactivation-${i}`,
    clientName: c.name,
    opportunityType: "reactivation" as const,
    summary: "Last visit 120 days ago — win-back candidate.",
    estimatedValue: 285 - i * 15,
    confidence: "high" as const,
    suggestedAction: "Send a personal rebooking invite.",
  }));

  const referralOpportunities = DEMO_CLIENTS.filter((c) => c.status !== "lapsed").map((c, i) => ({
    id: `demo-referral-${i}`,
    clientName: c.name,
    opportunityType: "referral" as const,
    summary: `Repeat client with ${5 + i} visits — strong referral potential.`,
    estimatedValue: 240 - i * 10,
    confidence: "medium" as const,
    suggestedAction: "Ask for a trusted beauty-circle intro.",
  }));

  const giftOpportunities = [
    {
      id: "demo-gift-1",
      clientName: "Maya Chen",
      opportunityType: "gift" as const,
      summary: 'Service "Birthday Blowout" signals a gift or celebration moment.',
      estimatedValue: 175,
      confidence: "high" as const,
      suggestedAction: "Promote a birthday offer.",
    },
  ];

  return {
    analysisId: "demo-operating-analysis",
    salonName: DEMO_SALON_NAME,
    recordCount: 100,
    reactivationTargets:
      reactivationTargets.length > 0
        ? reactivationTargets
        : [
            {
              id: "demo-reactivation-fallback",
              clientName: "Amy Johnson",
              opportunityType: "reactivation",
              summary: "Last visit 120 days ago — win-back candidate.",
              estimatedValue: 285,
              confidence: "high",
              suggestedAction: "Send a personal rebooking invite.",
            },
          ],
    referralOpportunities:
      referralOpportunities.length > 0
        ? referralOpportunities
        : [
            {
              id: "demo-referral-fallback",
              clientName: "Taylor Brooks",
              opportunityType: "referral",
              summary: "Repeat client with 6 visits — strong referral potential.",
              estimatedValue: 240,
              confidence: "medium",
              suggestedAction: "Ask for a trusted intro.",
            },
          ],
    giftOpportunities:
      giftOpportunities.length > 0
        ? giftOpportunities
        : [
            {
              id: "demo-gift-fallback",
              clientName: "Jordan Lee",
              opportunityType: "gift",
              summary: 'Service "Birthday Package" signals a celebration moment.',
              estimatedValue: 175,
              confidence: "medium",
              suggestedAction: "Promote a birthday offer.",
            },
          ],
    trustedProviderIntroOpportunities: [],
    estimatedRecoverableRevenue: DEMO_START_ANALYSIS.estimatedRecoverableRevenue,
    generatedAt: new Date().toISOString(),
  };
}
