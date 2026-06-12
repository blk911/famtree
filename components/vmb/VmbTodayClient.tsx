"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ActivityTimeline } from "@/components/taikos/activity/ActivityTimeline";
import { TaikosInsightList } from "@/components/taikos/coda/TaikosInsightList";
import { TodayCodaBanner } from "@/components/taikos/coda/TodayCodaBanner";
import { TodayInlineAios } from "@/components/taikos/TodayInlineAios";
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
  context: AiosContextPacket;
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
  hasCompletedFirstIngest?: boolean;
  activeAnalysisId?: string;
};

export function VmbTodayClient({
  salonName,
  operatorName,
  hasCompletedFirstIngest = false,
  activeAnalysisId,
}: Props) {
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hasCompletedFirstIngest) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const ctxRes = await fetch(
        "/api/taikos/context?pathname=/vmb/today&recordLogin=0",
        { cache: "no-store", credentials: "include" },
      );
      const ctxJson = (await ctxRes.json()) as {
        ok: boolean;
        data?: AiosContextPacket;
      };

      if (ctxRes.ok && ctxJson.ok && ctxJson.data) {
        const slice = ctxJson.data;
        const owner = slice.operatorName ?? operatorName ?? "Owner";
        const codaSummary = slice.codaSummary ?? emptyCodaSummary(owner);
        setData({
          greeting: greetingForOperator(slice.salonName ?? salonName ?? "Your Salon", owner),
          context: slice,
          codaSummary,
          goalSummary: slice.goalSummary ?? EMPTY_GOAL_SUMMARY,
          opportunitySummary: slice.opportunitySummary ?? EMPTY_OPPORTUNITY_SUMMARY,
          queueSummary: slice.queueSummary ?? EMPTY_QUEUE_SUMMARY,
          activitySummary: slice.activitySummary ?? EMPTY_ACTIVITY_SUMMARY,
          draftSummary: slice.draftSummary ?? EMPTY_DRAFT_SUMMARY,
        });
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [hasCompletedFirstIngest, operatorName, salonName]);

  useEffect(() => {
    void load();
  }, [load]);

  const codaSummary = data?.codaSummary ?? emptyCodaSummary(operatorName ?? "Owner");
  const insights = codaSummary.insights ?? [];

  return (
    <VmbPageFrame
      eyebrow={salonName ?? "Your Salon"}
      title="Today"
      subtitle="Relationship guidance — context, objective, discovery, and your next action."
      showAiosSparkle={false}
    >
      {loading ? (
        <p className="vmb-page-state">Loading your operating brief…</p>
      ) : !hasCompletedFirstIngest ? (
        <div className="vmb-page-state">
          <p>Connect your book to unlock Today.</p>
          <p style={{ marginTop: 12 }}>
            <Link href="/vmb/start">Find The Money</Link>
          </p>
        </div>
      ) : data ? (
        <div className="vmb-today">
          <TodayCodaBanner greeting={data.greeting} coda={codaSummary} />

          <TodayInlineAios
            context={data.context}
            analysisId={activeAnalysisId ?? data.context.analysisId}
          />

          <TaikosInsightList insights={insights} onRefresh={load} />

          <OpportunityList
            summary={data.opportunitySummary}
            insights={insights}
            goals={data.goalSummary.goals}
            onRefresh={load}
          />

          <GoalSummary
            summary={data.goalSummary}
            opportunities={data.opportunitySummary.opportunities}
            onRefresh={load}
          />

          <TodayQueuePanel summary={data.queueSummary} />

          <TodayDraftPanel drafts={data.draftSummary.recentDrafts} onRefresh={load} />

          <section className="vmb-today__section">
            <div className="vmb-today__section-head">
              <h3 className="taikos-section-title">Activity</h3>
              <Link href="/vmb/activity" className="vmb-today__link">
                View all
              </Link>
            </div>
            <ActivityTimeline summary={data.activitySummary} compact />
          </section>
        </div>
      ) : (
        <p className="vmb-page-state">Could not load Today — refresh or re-upload your book.</p>
      )}
    </VmbPageFrame>
  );
}
