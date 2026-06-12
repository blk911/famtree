"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ActivityTimeline } from "@/components/taikos/activity/ActivityTimeline";
import { InlineAiosPanel } from "@/components/taikos/InlineAiosPanel";
import { TaikosInsightList } from "@/components/taikos/coda/TaikosInsightList";
import { TodayCodaBanner } from "@/components/taikos/coda/TodayCodaBanner";
import { GoalSummary } from "@/components/taikos/goals/GoalSummary";
import { OpportunityList } from "@/components/taikos/opportunities/OpportunityList";
import { TodayDraftPanel } from "@/components/taikos/workflow/TodayDraftPanel";
import { TodayQueuePanel } from "@/components/taikos/workflow/TodayQueuePanel";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import { emptyCodaSummary } from "@/lib/taikos/coda/defaults";
import type { TaikosActivitySummary } from "@/lib/taikos/activity/activity-types";
import type { CodaSummary } from "@/lib/taikos/coda/types";
import type { TaikosDraftSummary } from "@/lib/taikos/drafts/types";
import type { TaikosGoalSummary } from "@/lib/taikos/goals/types";
import type { TaikosOpportunitySummary } from "@/lib/taikos/opportunities/types";
import type { TaikosQueueSummary } from "@/lib/taikos/queue/types";
import { greetingForOperator } from "@/lib/taikos/context/greeting";
import type { AiosContextPacket } from "@/lib/taikos/types";

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
  activeAnalysisId?: string;
};

export function VmbTodayClient({
  salonName = "Your Salon",
  operatorName = "Owner",
  hasCompletedFirstIngest = false,
  activeAnalysisId,
}: Props) {
  const [data, setData] = useState<TodayData | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [aiosOpen, setAiosOpen] = useState(false);

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
          greeting: greetingForOperator(slice.salonName ?? salonName, slice.operatorName ?? owner),
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
          greeting: greetingForOperator(salonName, owner),
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
        greeting: greetingForOperator(salonName, operatorName),
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

  const todayUnlocked = hasCompletedFirstIngest;
  const codaSummary = data?.codaSummary ?? emptyCodaSummary(operatorName);
  const insights = codaSummary.insights ?? [];
  const greeting = data?.greeting ?? greetingForOperator(salonName, operatorName);

  return (
    <VmbPageFrame width="standard" headerless>
      <header className="vmb-page-frame__header">
        <p className="vmb-page-frame__eyebrow">{salonName}</p>
        <div className="vmb-page-frame__title-row">
          <h1 className="vmb-page-frame__title">Today</h1>
          {todayUnlocked ? (
            <button
              type="button"
              className="today-aios-sparkle"
              aria-label="Open tAIkOS guidance"
              aria-expanded={aiosOpen}
              onClick={() => setAiosOpen((open) => !open)}
            >
              ✨
            </button>
          ) : null}
        </div>
        <p className="vmb-page-frame__subtitle">
          Relationship guidance — context, objective, discovery, and your next action.
        </p>

        {aiosOpen && todayUnlocked ? (
          <InlineAiosPanel
            context={data?.context}
            operatorName={operatorName}
            salonName={salonName}
            analysisId={activeAnalysisId ?? data?.context?.analysisId}
            onClose={() => setAiosOpen(false)}
          />
        ) : null}
      </header>

      {!todayUnlocked ? (
        <div className="vmb-page-state">
          <p>Connect your book to unlock Today.</p>
          <p style={{ marginTop: 12 }}>
            <Link href="/vmb/start">Find The Money</Link>
          </p>
        </div>
      ) : (
        <div className="vmb-today">
          {contextLoading && !data ? (
            <p className="vmb-page-state">Loading your operating brief…</p>
          ) : null}

          <TodayCodaBanner greeting={greeting} coda={codaSummary} />

          <TaikosInsightList insights={insights} onRefresh={loadContext} />

          <OpportunityList
            summary={data?.opportunitySummary ?? EMPTY_OPPORTUNITY_SUMMARY}
            insights={insights}
            goals={data?.goalSummary.goals ?? []}
            onRefresh={loadContext}
          />

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
