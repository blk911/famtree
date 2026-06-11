import { getActiveVmbAnalysis } from "@/lib/vmb/active-analysis-resolver";
import { getVmbBookAnalysisForTrial } from "@/lib/vmb/book-analysis/analysis-store";
import { buildVmbOperatingSnapshot } from "@/lib/vmb/operating-system";
import { buildAppointmentOpeningsSummary } from "@/lib/vmb/operating-system/appointment-openings";
import { listInviteDraftsForTrial } from "@/lib/vmb/invite-drafts/invite-draft-store";
import { isRefreshDue, workspaceLatestAnalysisId } from "@/lib/vmb/workspace-lifecycle";
import { getWorkspaceForTrial } from "@/lib/vmb/workspace-store";
import { buildClientSummaryFromAnalysis } from "@/lib/taikos/context/client-summary-builder";
import { buildContactSignals } from "@/lib/taikos/context/contact-signals";
import { enrichPageContextWithDrafts } from "@/lib/taikos/context/draft-context";
import { resolvePageContext } from "@/lib/taikos/context/page-registry";
import { summarizeDraftsForSalon } from "@/lib/taikos/drafts/draft-store";
import { runAllAiosRules } from "@/lib/taikos/rules";
import {
  getSessionSnapshot,
  recordSalonLogin,
  recordPageView,
} from "@/lib/taikos/session/session-manager";
import type {
  AiosAlert,
  AiosContextPacket,
  AiosOpportunity,
  AiosRecommendation,
} from "@/lib/taikos/types";

export type BuildAiosContextInput = {
  trialId: string;
  pathname: string;
  searchParams?: URLSearchParams;
  analysisId?: string;
  aiosOpen?: boolean;
  recordLogin?: boolean;
};

function operatorIdFromWorkspace(ownerName?: string, email?: string): string {
  return (email?.trim() || ownerName?.trim() || "operator").toLowerCase();
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export async function buildAiosContextPacket(
  input: BuildAiosContextInput,
): Promise<AiosContextPacket | null> {
  const workspace = await getWorkspaceForTrial(input.trialId);
  if (!workspace) return null;

  const salonId = input.trialId;
  const operatorId = operatorIdFromWorkspace(workspace.ownerName, workspace.email);

  if (input.recordLogin !== false) {
    await recordSalonLogin(salonId, operatorId);
  }
  await recordPageView(salonId, operatorId, input.pathname);

  const resolved = await getActiveVmbAnalysis(input.trialId, {
    queryId: input.analysisId?.trim(),
  });
  const analysisId = resolved.analysisId ?? workspaceLatestAnalysisId(workspace);
  const analysis = analysisId
    ? await getVmbBookAnalysisForTrial(analysisId, input.trialId)
    : undefined;

  const drafts = analysisId
    ? await listInviteDraftsForTrial(input.trialId, analysisId)
    : [];

  const inviteState = {
    invited: drafts.filter((d) => d.status === "approved" || d.status === "sent").length,
    joined: drafts.filter((d) => d.status === "sent").length,
  };

  const snapshot = buildVmbOperatingSnapshot(analysis, { inviteState });
  const openings = analysis ? buildAppointmentOpeningsSummary(analysis) : { count: 0, slots: [] };
  const clientSummary = buildClientSummaryFromAnalysis(analysis);
  const contactSignals = buildContactSignals(analysis);
  const draftSummary = await summarizeDraftsForSalon(salonId);
  const page = enrichPageContextWithDrafts(
    resolvePageContext(input.pathname, input.searchParams),
    draftSummary,
  );

  const ruleResults = runAllAiosRules(analysis, { inviteState });
  const opportunities: AiosOpportunity[] = ruleResults
    .map((r) => r.opportunity)
    .filter((o): o is AiosOpportunity => !!o);

  const recommendations: AiosRecommendation[] = ruleResults.map((r) => ({
    id: r.ruleId,
    message: r.recommendation,
    estimatedValue: r.value,
    ruleId: r.ruleId,
  }));

  const alerts: AiosAlert[] = [];
  if (workspace && isRefreshDue(workspace)) {
    alerts.push({
      id: "refresh-due",
      message: "Book refresh is due — upload a fresh export to keep moves accurate.",
      severity: "notice",
    });
  }
  if (!analysis) {
    alerts.push({
      id: "no-analysis",
      message: "Complete Find The Money to unlock tAIkOS signals.",
      severity: "info",
    });
  }

  const session = await getSessionSnapshot(salonId, operatorId, input.aiosOpen ?? false);
  const activityWatermark = analysis?.generatedAt ?? workspace.updatedAt;
  const newActivity =
    !!activityWatermark &&
    (!session.lastActivityWatermark || activityWatermark > session.lastActivityWatermark);

  const salonName = workspace.salonName?.trim() || analysis?.salonName?.trim() || "Your Salon";
  const operatorName = workspace.ownerName?.trim() || input.trialId;

  return {
    salonId,
    operatorId,
    operatorName,
    salonName,
    analysisId: analysis?.analysisId ?? analysisId,
    hasRealBookData: contactSignals.hasRealBookData,
    contactCandidates: contactSignals.contactCandidates,
    overdueClients: contactSignals.overdueClients,
    saturdayCandidates: contactSignals.saturdayCandidates,
    currentPage: page,
    currentSession: session,
    calendarSummary: {
      openSlots: openings.count,
      slots: openings.slots,
    },
    clientSummary,
    pcnSummary: {
      invitesReady: snapshot?.network.readyThisWeek ?? 0,
      invitesApproved: drafts.filter((d) => d.status === "approved").length,
      invitesSent: drafts.filter((d) => d.status === "sent").length,
      membersJoined: inviteState.joined,
    },
    revenueSummary: {
      touchesReady: snapshot?.weeklyRevenue.readyThisWeek ?? 0,
      potentialRevenue: snapshot?.weeklyRevenue.potentialRevenue ?? analysis?.estimatedRecoverableRevenue ?? 0,
    },
    opportunities,
    alerts,
    recommendations,
    lastLogin: session.lastLoginAt,
    firstLoginToday: session.firstLoginToday,
    loginCountToday: session.loginCountToday,
    lastViewedPage: session.lastViewedPage,
    newActivity,
    draftSummary,
    generatedAt: new Date().toISOString(),
  };
}

export function greetingForOperator(salonName: string, operatorName?: string): string {
  const hour = new Date().getHours();
  const period = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  const who = operatorName ? firstName(operatorName) : firstName(salonName);
  return `Good ${period} ${who}`;
}
