"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LoadYourBookCta } from "@/components/vmb/LoadYourBookCta";
import { TodayCommandCenter } from "@/components/vmb/today/TodayCommandCenter";
import { ActivityTimeline } from "@/components/taikos/activity/ActivityTimeline";
import { InlineAiosPanel } from "@/components/taikos/InlineAiosPanel";
import { TaikosInsightList } from "@/components/taikos/coda/TaikosInsightList";
import { TodayCodaBanner, TODAY_CODA_SEARCH_INPUT_ID } from "@/components/taikos/coda/TodayCodaBanner";
import { SalonQaPreviewModal } from "@/components/taikos/coda/SalonQaPreviewModal";
import { GoalSummary } from "@/components/taikos/goals/GoalSummary";
import { OpportunityList } from "@/components/taikos/opportunities/OpportunityList";
import { TodayProspectFeedProvider } from "@/components/taikos/workflow/TodayProspectFeedContext";
import { TodayDraftPanel } from "@/components/taikos/workflow/TodayDraftPanel";
import { TodayQueuePanel } from "@/components/taikos/workflow/TodayQueuePanel";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import { LaunchGuideBubble } from "@/components/vmb/onboarding/LaunchGuideBubble";
import { LaunchGuideOverlay } from "@/components/vmb/onboarding/LaunchGuideOverlay";
import { LaunchGuideSummaryModal } from "@/components/vmb/onboarding/LaunchGuideSummaryModal";
import { TaikosAskReminder } from "@/components/vmb/onboarding/TaikosAskReminder";
import { emptyCodaSummary } from "@/lib/taikos/coda/defaults";
import type { TaikosActivitySummary } from "@/lib/taikos/activity/activity-types";
import type { CodaSummary } from "@/lib/taikos/coda/types";
import type { SalonQaPreviewCardAction, TodayActiveQuestionResult } from "@/lib/taikos/salon-qa/types";
import type { TaikosDraftSummary } from "@/lib/taikos/drafts/types";
import type { TaikosGoalSummary } from "@/lib/taikos/goals/types";
import type { TaikosOpportunitySummary } from "@/lib/taikos/opportunities/types";
import type { TaikosQueueSummary } from "@/lib/taikos/queue/types";
import { buildTodayGreeting } from "@/lib/taikos/context/today-conversation";
import type { AiosContextPacket } from "@/lib/taikos/types";
import type { VmbFullFlowDebug } from "@/lib/vmb/debug-full-flow";
import { useVmbLaunchGuide } from "@/lib/vmb/onboarding/use-vmb-launch-guide";
import { performLaunchGuideCta } from "@/lib/vmb/onboarding/launch-guide-targets";
import {
  LAUNCH_GUIDE_STEPS,
  LAUNCH_GUIDE_TOTAL_STEPS,
  shouldShowTaikosReminder,
} from "@/lib/vmb/onboarding/vmb-launch-guide";
import { logTodayLockBranch, logTodayLockRendered } from "@/lib/vmb/today-lock-debug";
import { VMB_BOOK_LOAD_HELPER, VMB_BOOK_LOCKED_MESSAGE } from "@/lib/vmb/book-load-cta";
import { buildTodayCommandCenterSnapshot } from "@/lib/vmb/today-command-center";
import type { VmbInviteDraft } from "@/types/vmb/invite-draft";

type TodayData = {
  greeting: string;
  context: AiosContextPacket | null;
  codaSummary: CodaSummary;
  goalSummary: TaikosGoalSummary;
  opportunitySummary: TaikosOpportunitySummary;
  queueSummary: TaikosQueueSummary;
  activitySummary: TaikosActivitySummary;
  draftSummary: TaikosDraftSummary;
};

const EMPTY_GOAL_SUMMARY: TaikosGoalSummary = {
  totalGoals: 0,
  activeGoals: 0,
  completedGoals: 0,
  archivedGoals: 0,
  goals: [],
};

const EMPTY_OPPORTUNITY_SUMMARY: TaikosOpportunitySummary = {
  totalOpportunities: 0,
  highPriority: 0,
  topOpportunity: null,
  opportunities: [],
};

const EMPTY_QUEUE_SUMMARY: TaikosQueueSummary = {
  totalItems: 0,
  queuedItems: 0,
  readyItems: 0,
  blockedItems: 0,
  completedItems: 0,
  recentItems: [],
  allItems: [],
};

const EMPTY_ACTIVITY_SUMMARY: TaikosActivitySummary = {
  totalEvents: 0,
  recentEvents: [],
};

const EMPTY_DRAFT_SUMMARY: TaikosDraftSummary = {
  totalDrafts: 0,
  openDrafts: 0,
  draftsByType: {},
  recentDrafts: [],
};

type Props = {
  salonName?: string;
  operatorName?: string;
  /** Original VMB process handoff — server-derived, not AIOS/CODA. */
  hasCompletedFirstIngest?: boolean;
  wouldUnlockToday?: boolean;
  lockReason?: string | null;
  activeAnalysisId?: string;
  recordCount?: number;
  clientCount?: number;
  pageContext?: Record<string, unknown>;
};

export function VmbTodayClient({
  salonName = "Your Salon",
  operatorName = "Owner",
  hasCompletedFirstIngest = false,
  wouldUnlockToday = false,
  lockReason = null,
  activeAnalysisId,
  recordCount = 0,
  clientCount = 0,
  pageContext,
}: Props) {
  const [data, setData] = useState<TodayData | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [aiosOpen, setAiosOpen] = useState(false);
  const [flowDebug, setFlowDebug] = useState<VmbFullFlowDebug | null>(null);
  const [activeQuestionResult, setActiveQuestionResult] = useState<TodayActiveQuestionResult | null>(
    null,
  );
  const [previewFirstCardSignal, setPreviewFirstCardSignal] = useState(0);
  const [qaPreviewAction, setQaPreviewAction] = useState<SalonQaPreviewCardAction | null>(null);
  const [hasActiveTaikosAnswer, setHasActiveTaikosAnswer] = useState(false);
  const [vmbInviteDrafts, setVmbInviteDrafts] = useState<VmbInviteDraft[]>([]);

  useEffect(() => {
    console.error("[TODAY-MOUNT]", {
      hasCompletedFirstIngest,
      analysisId: activeAnalysisId,
      pathname: typeof window !== "undefined" ? window.location.pathname : null,
      search: typeof window !== "undefined" ? window.location.search : null,
    });
  }, [hasCompletedFirstIngest, activeAnalysisId]);

  const loadContext = useCallback(async () => {
    if (!hasCompletedFirstIngest) return;

    setContextLoading(true);
    try {
      const ctxRes = await fetch(
        "/api/taikos/context?pathname=/vmb/today&recordLogin=0",
        { cache: "no-store", credentials: "include" },
      );
      const ctxJson = (await ctxRes.json()) as {
        ok: boolean;
        data?: AiosContextPacket;
      };

      const owner = operatorName;
      const codaSummary = emptyCodaSummary(owner);

      if (ctxRes.ok && ctxJson.ok && ctxJson.data) {
        const slice = ctxJson.data;
        setData({
          greeting: buildTodayGreeting(slice.operatorName ?? owner, slice.salonName ?? salonName),
          context: slice,
          codaSummary: slice.codaSummary ?? codaSummary,
          goalSummary: slice.goalSummary ?? EMPTY_GOAL_SUMMARY,
          opportunitySummary: slice.opportunitySummary ?? EMPTY_OPPORTUNITY_SUMMARY,
          queueSummary: slice.queueSummary ?? EMPTY_QUEUE_SUMMARY,
          activitySummary: slice.activitySummary ?? EMPTY_ACTIVITY_SUMMARY,
          draftSummary: slice.draftSummary ?? EMPTY_DRAFT_SUMMARY,
        });
      } else {
        setData({
          greeting: buildTodayGreeting(owner, salonName),
          context: null,
          codaSummary,
          goalSummary: EMPTY_GOAL_SUMMARY,
          opportunitySummary: EMPTY_OPPORTUNITY_SUMMARY,
          queueSummary: EMPTY_QUEUE_SUMMARY,
          activitySummary: EMPTY_ACTIVITY_SUMMARY,
          draftSummary: EMPTY_DRAFT_SUMMARY,
        });
      }
    } catch {
      setData({
        greeting: buildTodayGreeting(operatorName, salonName),
        context: null,
        codaSummary: emptyCodaSummary(operatorName),
        goalSummary: EMPTY_GOAL_SUMMARY,
        opportunitySummary: EMPTY_OPPORTUNITY_SUMMARY,
        queueSummary: EMPTY_QUEUE_SUMMARY,
        activitySummary: EMPTY_ACTIVITY_SUMMARY,
        draftSummary: EMPTY_DRAFT_SUMMARY,
      });
    } finally {
      setContextLoading(false);
    }
  }, [hasCompletedFirstIngest, operatorName, salonName]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const resolvedAnalysisId = activeAnalysisId ?? data?.context?.analysisId;

  useEffect(() => {
    if (!hasCompletedFirstIngest || !resolvedAnalysisId?.trim()) {
      setVmbInviteDrafts([]);
      return;
    }

    let cancelled = false;
    async function loadVmbInviteDrafts() {
      try {
        const params = new URLSearchParams({ analysisId: resolvedAnalysisId!.trim() });
        const res = await fetch(`/api/vmb/invite-drafts?${params.toString()}`, {
          cache: "no-store",
          credentials: "include",
        });
        const json = (await res.json()) as { ok: boolean; data?: VmbInviteDraft[] };
        if (!cancelled) {
          setVmbInviteDrafts(res.ok && json.ok && json.data ? json.data : []);
        }
      } catch {
        if (!cancelled) setVmbInviteDrafts([]);
      }
    }

    void loadVmbInviteDrafts();
    return () => {
      cancelled = true;
    };
  }, [hasCompletedFirstIngest, resolvedAnalysisId]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    let cancelled = false;
    async function loadFlowDebug() {
      try {
        const params = new URLSearchParams(window.location.search);
        const analysis = params.get("analysis");
        const url = analysis
          ? `/api/vmb/debug/full-flow?analysis=${encodeURIComponent(analysis)}`
          : "/api/vmb/debug/full-flow";
        const res = await fetch(url, {
          cache: "no-store",
          credentials: "include",
        });
        const json = (await res.json()) as { ok: boolean; data?: VmbFullFlowDebug };
        if (!cancelled && res.ok && json.ok && json.data) {
          setFlowDebug(json.data);
        }
      } catch {
        // non-blocking debug
      }
    }
    void loadFlowDebug();
    return () => {
      cancelled = true;
    };
  }, [hasCompletedFirstIngest, activeAnalysisId]);

  const todayUnlocked = hasCompletedFirstIngest;
  const launchGuide = useVmbLaunchGuide(todayUnlocked);
  const showTaikosReminder = shouldShowTaikosReminder({
    hasActiveBook: todayUnlocked,
    hasActiveAnswer: hasActiveTaikosAnswer,
    guideVisible: launchGuide.visible,
  });
  const debugWouldUnlock = flowDebug?.todayLoader.wouldUnlockToday ?? wouldUnlockToday;
  const debugLockReason = flowDebug?.todayLoader.lockReason ?? lockReason;
  const debugAnalysisId =
    flowDebug?.todayLoader.usesAnalysisId ?? activeAnalysisId ?? null;
  const debugRecordCount = flowDebug?.todayLoader.recordCount ?? recordCount;
  const debugClientCount = flowDebug?.todayLoader.clientCount ?? clientCount;

  useEffect(() => {
    if (todayUnlocked) return;
    logTodayLockRendered({
      hasCompletedFirstIngest,
      wouldUnlockToday: debugWouldUnlock,
      lockReason: debugLockReason,
      analysisId: debugAnalysisId,
      recordCount: debugRecordCount,
      clientCount: debugClientCount,
      dataLoaded: !!data,
      pageContext,
    });
    logTodayLockBranch({
      file: "components/vmb/VmbTodayClient.tsx",
      component: "VmbTodayClient",
      hasCompletedFirstIngest,
      wouldUnlockToday: debugWouldUnlock,
      lockReason: debugLockReason,
      analysisId: debugAnalysisId,
      recordCount: debugRecordCount,
      clientCount: debugClientCount,
      dataLoaded: !!data,
      message: VMB_BOOK_LOCKED_MESSAGE,
      pageContext,
    });
  }, [
    todayUnlocked,
    hasCompletedFirstIngest,
    debugWouldUnlock,
    debugLockReason,
    debugAnalysisId,
    debugRecordCount,
    debugClientCount,
    data,
    pageContext,
  ]);

  const codaSummary = data?.codaSummary ?? emptyCodaSummary(operatorName);
  const insights = codaSummary.insights ?? [];
  const greeting = data?.greeting ?? buildTodayGreeting(operatorName, salonName);

  const analyzedClientCount = Math.max(
    debugClientCount,
    debugRecordCount,
    data?.context?.clientSummary?.totalClients ?? 0,
    data?.context?.recordCount ?? 0,
    data?.context?.codaSummary?.context?.importedClientCount ?? 0,
  );

  const commandCenter = useMemo(() => {
    if (!todayUnlocked) return null;
    return buildTodayCommandCenterSnapshot({
      hasBook: todayUnlocked,
      analysisId: resolvedAnalysisId,
      analyzedClientCount,
      opportunitySummary: data?.opportunitySummary ?? EMPTY_OPPORTUNITY_SUMMARY,
      queueSummary: data?.queueSummary ?? EMPTY_QUEUE_SUMMARY,
      taikosDraftSummary: data?.draftSummary ?? EMPTY_DRAFT_SUMMARY,
      vmbInviteDrafts,
    });
  }, [
    todayUnlocked,
    resolvedAnalysisId,
    analyzedClientCount,
    data?.opportunitySummary,
    data?.queueSummary,
    data?.draftSummary,
    vmbInviteDrafts,
  ]);

  return (
    <VmbPageFrame width="standard" headerless>
      {process.env.NODE_ENV === "development" ? (
        <p
          style={{
            margin: "0 0 12px",
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            background: "#fef3c7",
            color: "#92400e",
            border: "1px solid #fcd34d",
          }}
        >
          TODAY COMPONENT MOUNTED
        </p>
      ) : null}

      <header className="vmb-page-frame__header">
        {!todayUnlocked ? (
          <>
            <p className="vmb-page-frame__eyebrow">{salonName}</p>
            <div className="vmb-page-frame__title-row">
              <h1 className="vmb-page-frame__title">Today</h1>
            </div>
            <p className="vmb-page-frame__subtitle">
              Relationship guidance — context, objective, discovery, and your next action.
            </p>
          </>
        ) : null}
      </header>

      {process.env.NODE_ENV === "development" ? (
        <div
          style={{
            margin: "0 0 16px",
            padding: "10px 12px",
            border: "1px dashed #94a3b8",
            borderRadius: 8,
            fontSize: 14,
            color: "#334155",
          }}
        >
          Today scaffold rendered
        </div>
      ) : null}

      {!todayUnlocked ? (
        <div className="vmb-page-state">
          {process.env.NODE_ENV === "development" ? (
            <pre className="vmb-today-flow-debug">
              {[
                "TODAY DEBUG",
                `hasCompletedFirstIngest: ${String(hasCompletedFirstIngest)}`,
                `wouldUnlockToday: ${String(debugWouldUnlock)}`,
                `lockReason: ${debugLockReason ?? "—"}`,
                `analysisId: ${debugAnalysisId ?? "—"}`,
                `recordCount: ${debugRecordCount}`,
                `clientCount: ${debugClientCount}`,
                `activeAnalysisId: ${activeAnalysisId ?? "—"}`,
                `server.trialId: ${String(pageContext?.trialId ?? "—")}`,
                `api.latestAnalysisId: ${flowDebug?.currentWorkspace.latestAnalysisId ?? "—"}`,
                `api.resolvedAnalysisFound: ${String(flowDebug?.todayLoader.resolvedAnalysisFound ?? "—")}`,
              ].join("\n")}
            </pre>
          ) : null}
          <p>{VMB_BOOK_LOCKED_MESSAGE}</p>
          <p style={{ marginTop: 8, fontSize: 14, color: "#78716c" }}>{VMB_BOOK_LOAD_HELPER}</p>
          <p style={{ marginTop: 16 }}>
            <LoadYourBookCta />
          </p>
        </div>
      ) : (
        <div className="vmb-today">
          {contextLoading && !data ? (
            <p className="vmb-page-state">Loading your operating brief…</p>
          ) : null}

          <div className="today-page-title">
            <div className="today-page-title__salon">{salonName}</div>
            <TaikosAskReminder
              visible={showTaikosReminder}
              onFocusInput={() => {
                document.getElementById(TODAY_CODA_SEARCH_INPUT_ID)?.focus();
              }}
            />
            <div className="today-page-title__heading">
              <h1>
                Today{" "}
                <button
                  type="button"
                  className="today-aios-sparkle today-aios-sparkle--title"
                  aria-label="Open tAIkOS guidance"
                  aria-expanded={aiosOpen}
                  onClick={() => setAiosOpen((open) => !open)}
                >
                  ✨
                </button>
              </h1>
            </div>
            <p className="today-page-title__subtitle">
              Your book, the money VMB found, and what to do next.
            </p>
            {aiosOpen ? (
              <InlineAiosPanel
                context={data?.context}
                operatorName={operatorName}
                salonName={salonName}
                analysisId={activeAnalysisId ?? data?.context?.analysisId}
                onClose={() => setAiosOpen(false)}
              />
            ) : null}
          </div>

          {commandCenter ? <TodayCommandCenter snapshot={commandCenter} /> : null}

          <div className="today-greeting-card">
            <TodayCodaBanner
              coda={codaSummary}
              operatorName={operatorName}
              salonName={salonName}
              analysisId={activeAnalysisId}
              onQuestionAnswer={setActiveQuestionResult}
              onPreviewFirstCard={() => setPreviewFirstCardSignal((n) => n + 1)}
              onPreviewSuggestedCard={setQaPreviewAction}
              onAnswerActiveChange={setHasActiveTaikosAnswer}
            />
          </div>

          {launchGuide.showBubble ? (
            <LaunchGuideOverlay target={LAUNCH_GUIDE_STEPS[launchGuide.currentStep - 1]?.target ?? null}>
              <LaunchGuideBubble
                step={LAUNCH_GUIDE_STEPS[launchGuide.currentStep - 1]!}
                stepNumber={launchGuide.currentStep}
                totalSteps={LAUNCH_GUIDE_TOTAL_STEPS}
                onCta={() => {
                  const step = LAUNCH_GUIDE_STEPS[launchGuide.currentStep - 1];
                  if (step) {
                    performLaunchGuideCta(step.target);
                  }
                  launchGuide.nextStep();
                }}
                onBack={launchGuide.currentStep > 1 ? launchGuide.backStep : undefined}
                onSkip={launchGuide.skipGuide}
              />
            </LaunchGuideOverlay>
          ) : null}

          <LaunchGuideSummaryModal
            open={launchGuide.showSummary}
            onGotIt={launchGuide.finishGuide}
            onShowAgain={() => {
              launchGuide.restartGuide();
            }}
          />

          <SalonQaPreviewModal
            open={!!qaPreviewAction}
            action={qaPreviewAction}
            context={{
              salonName,
              operatorName,
              analysisId: activeAnalysisId,
            }}
            onClose={() => setQaPreviewAction(null)}
            onRefresh={loadContext}
          />

          <TodayProspectFeedProvider>
            <div className="today-prospect-feed">
              {(activeQuestionResult?.queryMode === "opportunity" &&
                (activeQuestionResult?.suggestedCards.length ?? 0) > 0) ? null : (
                <TaikosInsightList insights={insights} onRefresh={loadContext} />
              )}

              <OpportunityList
                summary={data?.opportunitySummary ?? EMPTY_OPPORTUNITY_SUMMARY}
                insights={insights}
                goals={data?.goalSummary.goals ?? []}
                analysisContext={{
                  analysisId: activeAnalysisId,
                  salonName,
                  hasRealBookData: hasCompletedFirstIngest,
                }}
                todayLayout
                questionResult={activeQuestionResult}
                previewFirstCardSignal={previewFirstCardSignal}
                onPreviewFirstCardConsumed={() => setPreviewFirstCardSignal(0)}
                onClearQuestionFilter={() => setActiveQuestionResult(null)}
                onRefresh={loadContext}
                salonId={typeof pageContext?.trialId === "string" ? pageContext.trialId : undefined}
              />
            </div>
          </TodayProspectFeedProvider>

          <GoalSummary
            summary={data?.goalSummary ?? EMPTY_GOAL_SUMMARY}
            opportunities={data?.opportunitySummary.opportunities ?? []}
            onRefresh={loadContext}
          />

          <TodayQueuePanel summary={data?.queueSummary ?? EMPTY_QUEUE_SUMMARY} />

          <TodayDraftPanel drafts={data?.draftSummary.recentDrafts ?? []} onRefresh={loadContext} />

          <section className="vmb-today__section">
            <div className="vmb-today__section-head">
              <h3 className="taikos-section-title">Activity</h3>
              <Link href="/vmb/activity" className="vmb-today__link">
                View all
              </Link>
            </div>
            <ActivityTimeline summary={data?.activitySummary ?? EMPTY_ACTIVITY_SUMMARY} compact />
          </section>
        </div>
      )}
    </VmbPageFrame>
  );
}
