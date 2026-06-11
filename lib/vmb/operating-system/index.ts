import { normalizeVmbBookAnalysisResult } from "@/lib/vmb/normalize-analysis";
import { DEMO_SALON_NAME } from "@/lib/vmb/demo-data";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import { buildNetworkLaunchSummary, type NetworkInviteState } from "./network-launch";
import { buildNewClientSummary } from "./new-clients";
import { buildStandardOffers } from "./standard-offers";
import type { VmbOperatingSnapshot } from "./types";
import { buildWeeklyRevenueSummary } from "./weekly-revenue";

export type { VmbOperatingSnapshot } from "./types";
export type { NetworkInviteState } from "./network-launch";
export { buildNetworkLaunchSummary } from "./network-launch";
export { buildNewClientSummary } from "./new-clients";
export { buildWeeklyRevenueSummary } from "./weekly-revenue";
export { buildStandardOffers } from "./standard-offers";
export { buildAppointmentOpeningsSummary } from "./appointment-openings";
export type { AppointmentOpeningsSummary } from "./appointment-openings";
export { scoreCandidate, extractClientPool, recencyScore, spendScoreFromValue } from "./client-pool";

export function buildVmbOperatingSnapshot(
  raw: VmbBookAnalysisResult | null | undefined,
  options?: {
    inviteState?: NetworkInviteState;
    salonNameFallback?: string;
  },
): VmbOperatingSnapshot | null {
  const analysis = normalizeVmbBookAnalysisResult(raw ?? null);
  if (!analysis) return null;

  const inviteState = options?.inviteState ?? { invited: 0, joined: 0 };

  return {
    salonName: analysis.salonName || options?.salonNameFallback || DEMO_SALON_NAME,
    analysisId: analysis.analysisId,
    network: buildNetworkLaunchSummary(analysis, inviteState),
    newClients: buildNewClientSummary(analysis),
    weeklyRevenue: buildWeeklyRevenueSummary(analysis),
    standardOffers: buildStandardOffers(),
  };
}
