import { buildClientOpportunities } from "@/lib/vmb/client-opportunities";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { WeeklyRevenueOpportunity, WeeklyRevenueSummary } from "./types";

function parseDaysInactive(summary: string): number | null {
  const match = summary.match(/(\d+)\s+days?\s+ago/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

export function buildWeeklyRevenueSummary(analysis: VmbBookAnalysisResult): WeeklyRevenueSummary {
  const longTimeNoSee = analysis.reactivationTargets.length;

  const bookNextAppointment = analysis.referralOpportunities.filter((opp) => {
    const visits = opp.summary.match(/(\d+)\s+visits?/i);
    const visitCount = visits ? Number.parseInt(visits[1], 10) : 0;
    return visitCount >= 3 || opp.estimatedValue >= 180;
  }).length;

  const birthday = analysis.giftOpportunities.filter((opp) =>
    opp.summary.toLowerCase().includes("birthday"),
  ).length;

  const opportunityRows = buildClientOpportunities(analysis).rows;
  const opportunities: WeeklyRevenueOpportunity[] = opportunityRows.slice(0, 12).map((row) => ({
    id: row.id,
    clientName: row.clientName,
    reason: row.trigger,
    suggestedAction: row.action,
    potentialRevenue: row.value,
  }));

  if (opportunities.length === 0) {
    for (const opp of analysis.reactivationTargets.slice(0, 4)) {
      const days = parseDaysInactive(opp.summary);
      opportunities.push({
        id: opp.id,
        clientName: opp.clientName,
        reason: days ? `${days} days inactive` : "Long time no see",
        suggestedAction: "We Miss You",
        potentialRevenue: opp.estimatedValue,
      });
    }
    for (const opp of analysis.referralOpportunities.slice(0, 3)) {
      opportunities.push({
        id: opp.id,
        clientName: opp.clientName,
        reason: opp.estimatedValue >= 200 ? "VIP client" : "Ready to rebook",
        suggestedAction: "Book Next Appointment",
        potentialRevenue: opp.estimatedValue,
      });
    }
    for (const opp of analysis.giftOpportunities.slice(0, 2)) {
      opportunities.push({
        id: opp.id,
        clientName: opp.clientName,
        reason: opp.summary.toLowerCase().includes("birthday") ? "Birthday" : "Celebration",
        suggestedAction: "Birthday Offer",
        potentialRevenue: opp.estimatedValue,
      });
    }
  }

  const potentialRevenue = opportunities.reduce((sum, row) => sum + row.potentialRevenue, 0);

  return {
    longTimeNoSee,
    bookNextAppointment,
    birthday: birthday || analysis.giftOpportunities.length,
    potentialRevenue: potentialRevenue || analysis.estimatedRecoverableRevenue,
    readyThisWeek: opportunities.length,
    opportunities: opportunities.sort((a, b) => b.potentialRevenue - a.potentialRevenue),
  };
}
