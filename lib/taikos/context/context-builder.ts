import { getActiveBookPointer } from "@/lib/vmb/active-book-pointer";
import { getActiveVmbAnalysis } from "@/lib/vmb/active-analysis-resolver";
import { getVmbBookAnalysis, getVmbBookAnalysisForTrial } from "@/lib/vmb/book-analysis/analysis-store";
import { resolveBookLoadedState } from "@/lib/vmb/book-status";
import { buildVmbOperatingSnapshot } from "@/lib/vmb/operating-system";
import { buildAppointmentOpeningsSummary } from "@/lib/vmb/operating-system/appointment-openings";
import { listInviteDraftsForTrial } from "@/lib/vmb/invite-drafts/invite-draft-store";
import { isRefreshDue, workspaceLatestAnalysisId } from "@/lib/vmb/workspace-lifecycle";
import { getWorkspaceForTrial } from "@/lib/vmb/workspace-store";
import { buildClientSummaryFromAnalysis } from "@/lib/taikos/context/client-summary-builder";
import { buildContactSignals } from "@/lib/taikos/context/contact-signals";
import { enrichPageContextWithOperatingState } from "@/lib/taikos/context/page-context-enrichment";
import { enrichPageContextWithDrafts } from "@/lib/taikos/context/draft-context";
import { resolvePageContext } from "@/lib/taikos/context/page-registry";
import { summarizeDraftsForSalon } from "@/lib/taikos/drafts/draft-store";
import { summarizeGoalsForSalon } from "@/lib/taikos/goals/goal-store";
import { buildRankedOpportunities } from "@/lib/taikos/opportunities/opportunity-builder";
import { summarizeOpportunities } from "@/lib/taikos/opportunities/opportunity-summary";
import { ensureSeedActivityFromContext, summarizeActivityForSalon } from "@/lib/taikos/activity/activity-builder";
import { listAllQueueItems } from "@/lib/taikos/queue/queue-store";
import { summarizeQueue } from "@/lib/taikos/queue/queue-summary";
import { buildCodaSummary } from "@/lib/taikos/coda/coda";
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

export { greetingForOperator } from "@/lib/taikos/context/greeting";

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

  const activeBookPointer = await getActiveBookPointer(salonId);

  const resolved = await getActiveVmbAnalysis(input.trialId, {
    queryId: input.analysisId?.trim(),
  });
  const analysisId =
    resolved.analysisId ??
    activeBookPointer?.analysisId ??
    workspaceLatestAnalysisId(workspace);

  let analysis = analysisId
    ? await getVmbBookAnalysisForTrial(analysisId, input.trialId)
    : undefined;
  if (!analysis && analysisId && activeBookPointer?.salonId === salonId) {
    const loose = await getVmbBookAnalysis(analysisId);
    if (loose && (!loose.trialId || loose.trialId === salonId)) {
      analysis = loose;
    }
  }

  const drafts = analysisId
    ? await listInviteDraftsForTrial(input.trialId, analysisId)
    : [];

  const inviteState = {
    invited: drafts.filter((d) => d.status === "approved" || d.status === "sent").length,
    joined: drafts.filter((d) => d.status === "sent").length,
  };

  const snapshot = buildVmbOperatingSnapshot(analysis, { inviteState });
  const openings = analysis ? buildAppointmentOpeningsSummary(analysis) : { count: 0, slots: [] };
  let clientSummary = buildClientSummaryFromAnalysis(analysis);
  let contactSignals = buildContactSignals(analysis);

  const pointerRecordCount = activeBookPointer?.recordCount ?? 0;
  const pointerClientCount = activeBookPointer?.clientCount ?? 0;
  const recordCount = analysis?.recordCount ?? pointerRecordCount;

  if (
    activeBookPointer &&
    activeBookPointer.salonId === salonId &&
    resolveBookLoadedState({
      hasRealBookData: contactSignals.hasRealBookData,
      clientSummary,
      analysisId: analysis?.analysisId ?? analysisId,
      recordCount,
    }) === false
  ) {
    const imported = Math.max(pointerClientCount, pointerRecordCount);
    clientSummary = {
      ...clientSummary,
      totalClients: Math.max(clientSummary.totalClients, imported),
      activeClients: Math.max(clientSummary.activeClients, imported),
    };
    contactSignals = {
      ...contactSignals,
      hasRealBookData: imported > 0,
    };
  }
  const draftSummary = await summarizeDraftsForSalon(salonId);
  const basePage = resolvePageContext(input.pathname, input.searchParams);

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

  const resolvedAnalysisId = analysis?.analysisId ?? analysisId ?? activeBookPointer?.analysisId;
  const hasRealBookData =
    contactSignals.hasRealBookData ||
    resolveBookLoadedState({
      hasRealBookData: contactSignals.hasRealBookData,
      clientSummary,
      analysisId: resolvedAnalysisId,
      recordCount,
    });

  const basePacket = {
    salonId,
    operatorId,
    operatorName,
    salonName,
    analysisId: resolvedAnalysisId,
    recordCount,
    hasRealBookData,
    contactCandidates: contactSignals.contactCandidates,
    overdueClients: contactSignals.overdueClients,
    saturdayCandidates: contactSignals.saturdayCandidates,
    currentPage: enrichPageContextWithDrafts(basePage, draftSummary),
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
  } satisfies Omit<
    AiosContextPacket,
    "goalSummary" | "opportunitySummary" | "queueSummary" | "activitySummary" | "codaSummary"
  >;

  const goalSummary = await summarizeGoalsForSalon(basePacket as AiosContextPacket);
  const ranked = buildRankedOpportunities(
    { ...basePacket, goalSummary } as AiosContextPacket,
    goalSummary.goals,
  );
  const opportunitySummary = summarizeOpportunities(ranked);
  const queueItems = await listAllQueueItems(salonId);
  const queueSummary = summarizeQueue(queueItems);

  let codaSummary = buildCodaSummary(
    { ...basePacket, goalSummary, opportunitySummary, queueSummary } as AiosContextPacket,
    analysis,
    workspace,
  );

  if (activeBookPointer && activeBookPointer.salonId === salonId) {
    const imported = Math.max(
      codaSummary.context.importedClientCount,
      clientSummary.totalClients,
      pointerClientCount,
      pointerRecordCount,
    );
    if (imported > codaSummary.context.importedClientCount) {
      codaSummary = {
        ...codaSummary,
        context: {
          ...codaSummary.context,
          importedClientCount: imported,
          verified: codaSummary.context.verified || workspace.firstIngestCompleted,
        },
      };
    }
  }

  const partialCtx = {
    ...basePacket,
    goalSummary,
    opportunitySummary,
    queueSummary,
    codaSummary,
    activitySummary: { totalEvents: 0, recentEvents: [] },
  } as AiosContextPacket;
  await ensureSeedActivityFromContext(partialCtx);
  const activitySummary = await summarizeActivityForSalon(salonId);

  const currentPage = enrichPageContextWithOperatingState(basePacket.currentPage, {
    draftSummary,
    goalSummary,
    opportunitySummary,
    queueSummary,
    activitySummary,
  });

  return {
    ...basePacket,
    currentPage,
    goalSummary,
    opportunitySummary,
    queueSummary,
    codaSummary,
    activitySummary,
  };
}

